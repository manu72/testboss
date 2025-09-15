# Test Boss POC

## Overview

Test Boss is a standalone Command Line Interface (CLI) tool designed for Mac OS, enabling quality assurance testers to efficiently create, record, and execute browser-based test suites against Salesforce applications. It leverages Playwright for robust browser automation and incorporates lightweight AI assistance to enhance test stability through improved selectors and assertion suggestions. Test suites are stored locally on disk as organized folders containing YAML step files, ensuring a transparent and manageable testing workflow.

## Features (Proof of Concept Scope)

The current Proof of Concept (POC) focuses on the following core functionalities:

1.  **Suite Creation:** Create named test suites as local folders with boilerplate configurations.
2.  **Step Recording:** Record browser steps within a suite using a real, headed browser.
3.  **Suite Execution:** Run test suites in a visible browser, allowing users to observe the test flow.
4.  **Results Viewing:** Access detailed test results via Playwright's HTML report, including per-step screenshots and a trace viewer.
5.  **Manual Login & Session Management:** Manual login through the Salesforce UI. Test Boss captures and reuses Playwright storage state per suite, eliminating the need for MFA on subsequent runs. Supports named sessions for different Salesforce users.
6.  **AI Assistance:** Minimal AI helpers to suggest improved selectors and propose assertions, designed to keep tests stable. AI is provider-neutral and can be disabled.

## Out of Scope for POC

The following functionalities are explicitly out of scope for this Proof of Concept:

*   CI and remote runners.
*   JWT or frontdoor authentication.
*   Cross-browser matrix testing or parallel sharding.
*   Visual baseline testing.
*   Complex test data factories.

## Constraints and Assumptions

*   **Platform:** Mac OS with Node.js 20 or later.
*   **Login Host:** Default login host is `https://test.salesforce.com`. Suites can override this with a specific My Domain login URL.
*   **Independence:** No dependence on the Salesforce codebase or SFDX. Test Boss is a separate repository and tool.
*   **User Login:** The tester can log in once in a headed browser. Storage state is saved per suite and reused.
*   **Multiple Sessions:** The POC supports multiple named sessions for different Salesforce users.

## High-Level Design

*   **Monorepo Structure:** The project is organized as a pnpm monorepo, with distinct packages for the CLI (`packages/cli`), runtime logic (`packages/runtime`), and AI helpers (`packages/ai`).
*   **CLI:** Implemented in TypeScript using the Commander.js library.
*   **Browser Control:** Playwright provides browser control, recording capabilities, and reporting.
*   **Runtime:** A simple runtime reads suite YAML files and executes actions, wrapping Playwright with consistent waits and error reporting.
*   **AI Helpers:** AI operates on recorded events and small DOM snippets to propose better locators and assertions. A generic provider interface supports OpenAI-compatible or local models.
*   **Data Storage:** All suite data resides under a `suites` directory, requiring no external services.

## Folder Layout

```
test-boss/
  packages/
    cli/
      src/
        commands/
          init.ts
          suite-create.ts
          step-record.ts
          run.ts
          report-open.ts
          session.ts
          ai-tune.ts
        io/
          fs.ts
          yaml.ts
        config/
          schema.ts
        index.ts
      package.json
    runtime/
      src/
        runner.ts
        compiler.ts
        selectors.ts
        asserts.ts
        salesforce.ts
        storage.ts
      package.json
    ai/
      src/
        provider.ts
        openai.ts
        prompts/
          locator-advisor.md
          assertion-suggester.md
          step-normalizer.md
      package.json
  templates/
    suite/
      suite.yaml
      env/sit.yaml
      steps/000_login.yaml
      .auth/.gitignore
      .gitignore
  package.json
  README.md
  SPEC.md
```

## Suite on Disk Structure

Each test suite is organized as a folder on disk, for example:

```
suites/
  Accounts_Smoke/
    suite.yaml
    env/
      sit.yaml
    steps/
      000_login.yaml
      010_create_account.yaml
      020_edit_account.yaml
    generated/
      spec.generated.ts
    artifacts/
      last-run/
        playwright-report/
        traces/
        screenshots/
    .auth/
      storage-state.default.json
      storage-state.session-qaprofile.json
```

## CLI Commands

*   `tb init`
    *   Create local configuration in the current repository and a `suites` folder.
*   `tb suite create <name> [--from-template <templateName>]`
    *   Scaffold a new suite with `suite.yaml`, environment configuration, and starter steps.
*   `tb step record [--suite <name>] [--env sit] [--session <sessionName>] [--url <startUrl>] [--ai on|off]`
    *   Open a headed browser, guide the user to log in, and capture actions.
    *   Save recorded steps to `steps/<timestamp>_<title>.yaml` after interactive confirmation.
*   `tb run [--suite <name>] [--env sit] [--session <sessionName>] [--headed] [--ai on|off]`
    *   Compile YAML steps into a transient Playwright spec and execute it.
    *   Save the Playwright report, screenshots, video, and trace.
*   `tb report open [--suite <name>]`
    *   Open the last Playwright HTML report for the specified suite in the default browser.
*   `tb session save [--suite <name>] [--session <sessionName>]`
    *   Save the current browser storage state under `.auth` for named reuse.
*   `tb ai tune [--suite <name>] [--step <file>] [--dry-run]`
    *   Run AI helpers on a specific step to upgrade locators and add assertions.

## Configuration Files

### `suite.yaml`

Defines the overall structure and settings for a test suite.

```yaml
name: "Accounts Smoke"
description: "Core UI flows for Account create edit view"
env: "sit"
defaultSession: "default"
steps:
  - steps/000_login.yaml
  - steps/010_create_account.yaml
  - steps/020_edit_account.yaml
```

### `env/sit.yaml`

Specifies environment-specific configurations for a suite.

```yaml
name: "SIT"
loginHost: "https://test.salesforce.com"
baseUrl: "https://your-domain.lightning.force.com"
playwright:
  headless: false
  viewport: { width: 1440, height: 900 }
timeouts:
  actionMs: 60000
  expectMs: 60000
ai:
  enabled: true
  provider: "openai"
  model: "gpt-4o-mini"
  maxTokens: 800
```

## Step YAML Schema

Each test step is defined in a YAML file with the following structure:

### Minimal Example

```yaml
id: "010_create_account"
title: "Create Account"
vars:
  accountName: "QA Playwright Co"
actions:
  - navigate: "/lightning/o/Account/list"
  - click:
      locator: role=button[name="New"]
  - fill:
      locator: data-testid=account-name
      value: "{{ accountName }}"
  - click:
      locator: role=button[name="Save"]
assertions:
  - url_matches: "/lightning/r/Account/[a-zA-Z0-9]{18}/view"
  - visible_text:
      text: "{{ accountName }}"
      within: role=region[name="Record Details"]
```

### Supported Actions

*   `navigate`: Relative or absolute URL.
*   `click`: Locator for the element to click.
*   `fill`: Locator for the input field and the value to fill.
*   `select`: Locator for the select element and the option (by label or value) to select.
*   `wait_for`: Locator for an element and its desired state (`visible`, `hidden`, or `attached`).
*   `set_var`: Name of the variable and its value.
*   `eval_js`: Small JavaScript snippet for advanced use cases.

### Supported Assertions

*   `url_contains`: Asserts that the URL contains a specific substring.
*   `url_matches`: Asserts that the URL matches a regular expression.
*   `visible_text`: Asserts that specific text is visible, with an optional `within` scope.
*   `locator_exists`: Asserts that a locator exists on the page.
*   `locator_has_value`: Asserts that a locator has a specific value.
*   `api_check` (read-only):
    *   `resource`: sObject name.
    *   `id_from`: URL regex or variable.
    *   `expect`: Map of field equals values.

## Recorder Design

*   Launches a headed Chromium browser.
*   Navigates to `env.baseUrl` or `loginHost` if storage state is missing.
*   The user manually logs in.
*   The recorder listens for `click`, `input`, `select`, and navigation events.
*   For each event, a small DOM snapshot around the element is captured.
*   If AI is enabled, the locator advisor proposes a durable locator (prioritizing `data-testid`, then `role` and accessible name, then text, then stable attributes).
*   The assertion suggester proposes one or two low-flake checks after meaningful actions (e.g., Save, Delete).
*   The user reviews a terminal preview and can edit or accept the suggestions.
*   The step is saved to YAML with a generated ID and title.

## Runtime Execution

*   Loads the suite and environment configurations.
*   Resolves the storage state file for the chosen session. If missing, it either runs a login step or prompts the user to record a login step.
*   Compiles YAML steps into a single `spec.generated.ts` file, with one Playwright test per step. Each action maps to a helper that wraps waits and error context.
*   For each `click` or `fill` action, the runtime waits for the locator to be attached and visible, with auto-retries on transient stale element errors.
*   On failure, the runtime captures a screenshot and ensures the trace is saved.

### Compiler Mapping Example

**YAML:**

```yaml
- click:
    locator: role=button[name="Save"]
```

**Generated TypeScript:**

```ts
await page.getByRole("button", { name: "Save" }).click();
```

## Selector Helpers

*   Parses a short locator syntax into Playwright calls:
    *   `data-testid=foo` → `page.locator('[data-testid="foo"]')`
    *   `role=button[name="Save"]` → `page.getByRole("button", { name: "Save" })`
    *   `text="New Case" within role=region[name="Related"]` → Region-scoped search.
*   Provides a region scope helper to avoid global text matches in steps.

### Short Locator Parser Example

```ts
export function toLocator(page, token: string) {
  if (token.startsWith("data-testid=")) {
    const id = token.split("=")[1];
    return page.locator(`[data-testid="${id}"]`);
  }
  if (token.startsWith("role=")) {
    const match = token.match(/^role=([^[]+)\[name="(.+)"\]$/);
    if (!match) throw new Error(`Bad role locator: ${token}`);
    return page.getByRole(match[1], { name: match[2] });
  }
  if (token.startsWith("text=")) {
    const text = token.slice("text=".length);
    return page.getByText(text, { exact: true });
  }
  return page.locator(token);
}
```

## Assertion Helpers

*   `url_contains` and `url_matches` utilize `expect(page).toHaveURL` with a configurable timeout.
*   `visible_text` uses a scoped locator with `toBeVisible` and `toContainText`.
*   `api_check` is optional. It issues a GET request to the REST resource when an instance URL and token are available. In the POC, this can be disabled by omitting the token, and the step will still pass if other assertions are successful.

## Login Flow and Sessions

*   The first run of a suite will open the login host in a headed browser.
*   The user manually enters credentials and completes MFA if required.
*   Upon successful login, Test Boss saves the storage state to `.auth/storage-state.default.json`.
*   Users can save additional sessions for other profiles using `tb session save --session <sessionName>`. These files are stored in `.auth` with the specified suffix.
*   `tb run` can select a session by name, enabling permission matrix tests without repeated logins.

## AI Helpers

### Provider Interface

```ts
export interface AIProvider {
  complete(params: {
    system: string;
    user: string;
    maxTokens?: number;
  }): Promise<string>;
}
```

### Locator Advisor Prompt Outline

*   **System:** "You are a senior Salesforce test engineer. Produce a durable Playwright locator. Prefer data test id. Then role and accessible name. Avoid deep CSS. Return only the best locator in a compact syntax."
*   **User:** Event type, raw selector from recorder, outerHTML of element, aria attributes, candidate text near the element.

### Assertion Suggester Prompt Outline

*   **System:** "Propose one or two assertions that validate user visible outcome with low flake. Use url matches and visible text. Optionally suggest a read only API check. Return YAML snippet only."
*   **User:** Step description, element kind, before and after URL, small DOM diff.

### Step Normalizer

*   Reduces noisy events into higher-value actions (e.g., multiple focus and key events collapse into a single `fill` action).

AI can be toggled off with a flag, in which case the recorder will retain raw Playwright selectors.

## Reports and Artifacts

*   Playwright HTML reports are stored under `artifacts/last-run/playwright-report`.
*   Screenshots and traces are stored per test. The tool prints a local path after each run.
*   `tb report open` launches the HTML report in the default browser.

## Error Handling

*   Clear console summary with step ID, title, pass/fail status, and duration.
*   On failure, the first error line and a path to the screenshot and trace are displayed.
*   The exit code is non-zero if any step fails.

## Security and Privacy

*   Storage state files are stored under `.auth` and are excluded from Git via `.gitignore`.
*   No secrets are written to YAML files.
*   AI requests include only small DOM snippets and never contain full pages or credentials.
*   The tool is designed to operate only on SIT or other non-production Salesforce organizations.

## Getting Started

To set up the project locally, follow these steps:

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd test-boss
    ```
2.  **Install pnpm:** If you don't have pnpm installed, you can install it globally using npm:
    ```bash
    npm install -g pnpm
    ```
3.  **Install dependencies:** Navigate to the project root and install all dependencies for the monorepo:
    ```bash
    pnpm install
    ```

## Minimal Happy Path (Quick Start)

1.  Initialize the project:
    ```bash
    tb init
    ```
2.  Create a new test suite:
    ```bash
    tb suite create "Accounts_Smoke"
    ```
3.  Record test steps:
    ```bash
    tb step record --suite "Accounts_Smoke" --env sit
    ```
    *   A browser will open to the Salesforce login host.
    *   Log in manually.
    *   Record actions (e.g., creating a new account and saving).
    *   Accept suggested assertions.
4.  Run the test suite in a headed browser:
    ```bash
    tb run --suite "Accounts_Smoke" --env sit --headed
    ```
5.  Open the Playwright HTML report:
    ```bash
    tb report open --suite "Accounts_Smoke"
    ```

## Developer Tasks

### CLI

*   Implement the listed commands using Commander.js.
*   Integrate a small spinner and clear prompts with Inquirer.js.

### Runtime

*   Implement YAML schema validation using Zod.
*   Develop the locator parser and scope helper.
*   Create action and assertion executors with sensible waits.
*   Implement storage state loader and writer.

### Recorder

*   Utilize Playwright's codegen as a source of events or develop a lightweight custom content script for capturing clicks and inputs.
*   Build a terminal review loop to display AI suggestions and allow user editing before saving.

### AI Layer

*   Implement the AI provider interface with an OpenAI-compatible adapter (using environment variables `TB_AI_API_KEY` and `TB_AI_BASE_URL`).
*   Develop the three prompt files: `locator-advisor.md`, `assertion-suggester.md`, and `step-normalizer.md`.
*   Implement a safe mode that redacts long attribute values.

### Templates

*   Create a template suite including a login step and a blank step.
*   Include `.gitignore` files for artifacts and authentication data.

## Acceptance Criteria

*   A tester can successfully create a suite, record a login plus one simple CRUD flow, run it in a visible browser, and open the HTML report without direct Playwright interaction.
*   Storage state is saved and reused, eliminating the need for repeated logins on subsequent runs.
*   When AI is enabled, at least one recorded step demonstrates an upgraded locator or assertion compared to the raw capture.
*   All outputs are local, and the project is fully standalone.
