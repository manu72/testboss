# Playwright POC Implementation Plan

This document details the implementation plan for the Test Boss Proof of Concept (POC), focusing on the Playwright integration and adhering to the specifications outlined in `SPEC.md`.
At each stage we will implement comprehensive unit tests and also update the README and SPEC as needed. Additionally we will pause and review the codebase at the end of each stage
to ensure best practice is followed.

## I. Project Setup and Core Structure

1.  **Monorepo Initialization:**
    - Initialize a pnpm monorepo at the project root.
    - Create `packages/cli`, `packages/runtime`, and `packages/ai` directories.
    - Configure `package.json` for each package and the root, defining workspaces.
    - Install core dependencies: `playwright`, `commander`, `inquirer`, `zod`, `yaml` in their respective packages.
    - Set up `tsconfig.json` for each package and a root `tsconfig.json` for consistent TypeScript configuration.

## II. CLI (`packages/cli`) Implementation

The `packages/cli` will house the command-line interface logic using Commander.js.

1.  **`tb init` Command:**

    - **Action:** Create a `suites/` directory at the project root if it doesn't exist.
    - **Action:** Create a boilerplate `test-boss.config.json` (or similar) in the project root for global configurations.
    - **Verification:** Ensure `suites/` and `test-boss.config.json` are created.

2.  **`tb suite create <name> [--from-template <templateName>]` Command:**

    - **Action:** Create `suites/<name>/` folder.
    - **Action:** Copy boilerplate files from `templates/suite/` into the new suite folder:
      - `suite.yaml`
      - `env/sit.yaml`
      - `steps/000_login.yaml`
      - `.auth/.gitignore`
      - `.gitignore` (for artifacts within the suite)
    - **Verification:** Verify the suite folder and its contents are correctly scaffolded.

3.  **`tb step record [--suite <name>] [--env sit] [--session <sessionName>] [--url <startUrl>] [--ai on|off]` Command:**

    - **Action:** Launch Playwright Chromium in headed mode.
    - **Action:** Implement initial navigation logic:
      - If a session exists, navigate to `env.baseUrl`.
      - If no session, navigate to `env.loginHost` to prompt manual login.
    - **Action:** Implement Playwright event listeners for `click`, `input`, `select`, and `navigation` events.
    - **Action:** For each event, capture a small DOM snapshot around the interacting element.
    - **Action (AI Integration):** If `--ai on` is specified:
      - Call `packages/ai/locator-advisor` to propose a durable locator.
      - Call `packages/ai/assertion-suggester` to propose one or two low-flake assertions after meaningful actions (e.g., form submission).
    - **Action:** Implement an interactive terminal preview using Inquirer.js, allowing the user to review, edit, or accept the recorded step and AI suggestions.
    - **Action:** Save the confirmed step to a new YAML file in `suites/<name>/steps/` (e.g., `000_login.yaml`, `010_create_account.yaml`).
    - **Action:** Capture and save Playwright storage state to `suites/<name>/.auth/storage-state.default.json` (or `storage-state.<sessionName>.json`) after successful login.
    - **Verification:** Recorded steps are saved correctly, and storage state is persisted.

4.  **`tb run [--suite <name>] [--env sit] [--session <sessionName>] [--headed] [--ai on|off]` Command:**

    - **Action:** Load `suite.yaml` and `env/<envName>.yaml` for the specified suite.
    - **Action:** Resolve and load Playwright storage state from `suites/<name>/.auth/storage-state.<sessionName>.json`.
    - **Action:** If storage state is missing for the chosen session, prompt the user to run `tb step record` for login or automatically execute a pre-defined login step (if available).
    - **Action:** Call `packages/runtime/compiler.ts` to read all step YAML files and generate a transient Playwright test file (`suites/<name>/generated/spec.generated.ts`).
    - **Action:** Execute the generated Playwright test file using `playwright test suites/<name>/generated/spec.generated.ts`.
    - **Action:** Configure Playwright to save reports, screenshots, and traces to `suites/<name>/artifacts/last-run/`.
    - **Action:** Implement error handling and console summary as per `SPEC.md`.
    - **Verification:** Tests run, reports are generated, and exit codes reflect test status.

5.  **`tb report open [--suite <name>]` Command:**

    - **Action:** Locate the latest Playwright HTML report within `suites/<name>/artifacts/last-run/playwright-report/`.
    - **Action:** Open the `index.html` of the report in the user's default web browser.
    - **Verification:** The Playwright report opens successfully.

6.  **`tb session save [--suite <name>] [--session <sessionName>]` Command:**

    - **Action:** Launch Playwright Chromium in headed mode.
    - **Action:** Navigate to the `env.loginHost` for the specified suite.
    - **Action:** Allow the user to manually log in.
    - **Action:** Save the current Playwright storage state to `suites/<name>/.auth/storage-state.<sessionName>.json`.
    - **Verification:** A new storage state file is created for the named session.

7.  **`tb ai tune [--suite <name>] [--step <file>] [--dry-run]` Command:**
    - **Action:** Load the specified step YAML file.
    - **Action:** Call `packages/ai/locator-advisor` and `packages/ai/assertion-suggester` with relevant step data (DOM snippets, event info).
    - **Action:** If `--dry-run` is not specified, apply the AI-suggested changes to the step YAML file.
    - **Action:** Provide a summary of changes made or proposed.
    - **Verification:** Locators and assertions are updated in the YAML file (or reported in dry-run).

## III. Runtime (`packages/runtime`) Implementation

The `packages/runtime` will handle the execution logic, compiling YAML steps into Playwright tests.

1.  **`runner.ts`:**

    - **Action:** Orchestrate the loading of suite/env configs, storage state, and calling the compiler.
    - **Action:** Manage Playwright browser context and page instances.

2.  **`compiler.ts`:**

    - **Action:** Implement logic to read `suite.yaml` and all associated step YAML files.
    - **Action:** Generate a single `spec.generated.ts` file.
    - **Action:** Map each YAML action (navigate, click, fill, etc.) to its corresponding Playwright API call, utilizing `selectors.ts` and `asserts.ts` helpers.
    - **Action:** Ensure consistent waits and error reporting are wrapped around Playwright actions.
    - **Verification:** Generated TypeScript file is syntactically correct and executable by Playwright.

3.  **`selectors.ts`:**

    - **Action:** Implement the `toLocator(page, token: string)` function as described in `SPEC.md`.
    - **Action:** Handle parsing for `data-testid=`, `role=button[name="Save"]`, `text="New Case"`, and generic CSS/XPath locators.
    - **Action:** Develop a region scope helper to enable scoped locator searches (e.g., `within: role=region[name="Record Details"]`).
    - **Verification:** All specified locator syntaxes are correctly translated to Playwright locators.

4.  **`asserts.ts`:**

    - **Action:** Implement `url_contains` and `url_matches` using `expect(page).toHaveURL` with configurable timeouts from `env.yaml`.
    - **Action:** Implement `visible_text` using a scoped locator, `toBeVisible()`, and `toContainText()`.
    - **Action:** Implement `locator_exists` and `locator_has_value`.
    - **Action:** Implement a basic `api_check` (read-only) that issues a GET request. For POC, token handling will be minimal or omitted, focusing on the request structure and response parsing.
    - **Verification:** All assertion types function as expected.

5.  **`salesforce.ts`:**

    - **Action:** Implement Salesforce-specific helper functions, such as consistent waits for common Salesforce UI elements (e.g., spinners, toasts, page loads).

6.  **`storage.ts`:**
    - **Action:** Implement functions to load and save Playwright storage state JSON files.

## IV. AI Layer (`packages/ai`) Implementation

The `packages/ai` will provide the interface and implementations for AI assistance.

1.  **`provider.ts`:**

    - **Action:** Define the `AIProvider` interface as specified in `SPEC.md`.

2.  **`openai.ts`:**

    - **Action:** Implement the `AIProvider` interface for OpenAI (or a compatible API).
    - **Action:** Read API key (`TB_AI_API_KEY`) and base URL (`TB_AI_BASE_URL`) from environment variables.
    - **Action:** Handle API calls and response parsing.

3.  **`prompts/` Directory:**

    - **Action:** Create `locator-advisor.md` with the system prompt for durable locator suggestions.
    - **Action:** Create `assertion-suggester.md` with the system prompt for low-flake assertion suggestions.
    - **Action:** Create `step-normalizer.md` (stretch goal for POC, prioritize locator/assertion first).

4.  **Safety and Redaction:**
    - **Action:** Implement a safe mode to redact long or sensitive attribute values from DOM snippets before sending them to the AI provider.

## V. Templates (`templates/`)

1.  **`templates/suite/` Directory:**
    - **Action:** Create `suite.yaml` with default suite configuration.
    - **Action:** Create `env/sit.yaml` with default SIT environment settings.
    - **Action:** Create `steps/000_login.yaml` as a starter login step.
    - **Action:** Create `.auth/.gitignore` and `.gitignore` files within the template to ensure artifacts and auth states are ignored by default.

## VI. General Considerations

1.  **Error Handling:** Implement robust error handling throughout the CLI and runtime, providing clear console summaries, step IDs, pass/fail status, duration, and paths to screenshots/traces on failure. Ensure non-zero exit codes for failed runs.
2.  **YAML Schema Validation:** Utilize `zod` in the runtime to validate the structure and content of `suite.yaml` and step YAML files.
3.  **Consistent Waits:** Ensure all Playwright actions in the runtime are wrapped with sensible waits (e.g., `waitFor({ state: "visible" })`, `waitUntil: "load"`) and auto-retry mechanisms for transient errors.

## VII. Updates to `SPEC.md` and `README.md`

Based on this detailed plan, the following improvements will be made to `SPEC.md` and `README.md`:

### `SPEC.md` Updates

- **Project Setup:** Add a new section under "High level design" or "Constraints and assumptions" explicitly stating the use of a pnpm monorepo.
- **`tb init`:** Clarify that `tb init` will also create a global config file (e.g., `test-boss.config.json`).
- **`tb step record`:** Emphasize the _interactive_ nature of AI suggestions and user confirmation.
- **`tb run`:** Clarify that `spec.generated.ts` is a transient file and will be cleaned up after execution.
- **`api_check`:** Reinforce that for the POC, `api_check` will be read-only and token handling will be minimal or omitted.

### `README.md` Updates

- **Getting Started:** Add a new "Getting Started" section with instructions on how to clone the repository, install pnpm, and run `pnpm install` at the root.
- **Minimal Happy Path:** Update the "Minimal Happy Path" to include `pnpm install` after cloning.
- **Monorepo Structure:** Briefly mention the monorepo structure and the purpose of `packages/cli`, `packages/runtime`, and `packages/ai`.

This plan provides a clear roadmap for implementing the Playwright POC functionality for Test Boss.
