# SPEC.md

## Title
Test Boss POC

## Summary
Test Boss is a standalone CLI for Mac OS that lets a tester create a named suite, record browser steps against Salesforce in a real headed browser, run those steps with Playwright, and view results with traces, screenshots, and video. The tool keeps suites on disk as folders with YAML step files. It includes lightweight AI helpers to improve selectors and propose assertions so tests remain stable without hardcoded rules where possible.

## Scope for POC
1. Create a named test suite as a local folder with boilerplate.
2. Create and record test steps inside that suite.
3. Run the suite in a visible browser so the user can watch the flow.
4. Show results with Playwright HTML report, per step screenshots, and trace viewer.
5. Login is manual through the Salesforce UI. On first run Test Boss captures and reuses Playwright storage state for that suite so MFA is not required on every run.
6. Add minimal AI assistance for selector choice and assertion suggestions. AI is provider neutral and can be disabled.

## Out of scope for POC
1. CI and remote runners.
2. JWT or frontdoor auth.
3. Cross browser matrix or parallel sharding.
4. Visual baseline testing.
5. Complex test data factories.

## Constraints and assumptions
- Platform is Mac OS with Node 20 or later.
- Default login host is https://test.salesforce.com. A suite can override with a specific My Domain login URL.
- No dependence on the Salesforce codebase or SFDX. This is a separate repo and tool.
- The tester can log in once in a headed browser. Storage state is saved per suite and reused.
- The user may want multiple saved sessions for different Salesforce users. The POC supports named sessions per suite.

## High level design
- CLI in TypeScript using Commander.
- Playwright supplies browser control, recorder, and report.
- A simple runtime reads suite YAML and executes actions. It wraps Playwright with consistent waits and error reporting.
- AI helpers operate on recorded events and small DOM snippets to propose better locators and assertions. A generic provider interface allows OpenAI compatible or local models.
- All suite data lives under a suites directory. No external services required.

## Folder layout
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

## Suite on disk
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

## CLI commands
```
tb init
  Create local config in the current repo and a suites folder.

tb suite create <name> [--from-template <templateName>]
  Scaffold a suite with suite.yaml, env config, and starter steps.

tb step record [--suite <name>] [--env sit] [--session <sessionName>] [--url <startUrl>] [--ai on|off]
  Open a headed browser, guide the user to log in, then capture actions.
  Save to steps/<timestamp>_<title>.yaml after interactive confirmation.

tb run [--suite <name>] [--env sit] [--session <sessionName>] [--headed] [--ai on|off]
  Compile YAML to a transient Playwright spec and execute it.
  Save report, screenshots, video, and trace.

tb report open [--suite <name>]
  Open the last Playwright HTML report for that suite.

tb session save [--suite <name>] [--session <sessionName>]
  Save current storage state under .auth for named reuse.

tb ai tune [--suite <name>] [--step <file>] [--dry-run]
  Run AI helpers on a step to upgrade locators and add assertions.
```

## Config files

### suite.yaml
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

### env/sit.yaml
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

## Step YAML schema

### Minimal example
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

### Supported actions
- navigate: relative or absolute URL
- click: locator
- fill: locator plus value
- select: locator plus option by label or value
- wait_for: locator plus state visible or hidden or attached
- set_var: name plus value
- eval_js: small script for advanced cases

### Supported assertions
- url_contains
- url_matches
- visible_text with optional within scope
- locator_exists
- locator_has_value
- api_check read only
  - resource sObject name
  - id_from url_regex or var
  - expect map of field equals values

## Recorder design
- Launch headed Chromium.
- Navigate to env.baseUrl or to loginHost if storage state is missing.
- The user logs in manually.
- The recorder listens for click, input, select, and navigation events.
- For each event the recorder grabs a small DOM snapshot around the element.
- If AI is on, the locator advisor proposes a durable locator. Selector priority is data test id then role and accessible name then text then stable attribute.
- The assertion suggester proposes one or two low flake checks after meaningful actions like Save or Delete.
- The user sees a terminal preview and can edit or accept.
- The step is saved to YAML with a generated id and title.

## Runtime execution
- Load suite and env.
- Resolve storage state file for the chosen session. If missing, run a login step first or prompt the user to run step record login.
- Compile YAML to a single spec.generated.ts with one Playwright test per step. Each action maps to a helper that wraps waits and error context.
- For each click or fill the runtime waits for the locator to be attached and visible. It auto retries on transient stale element errors.
- On failure the runtime captures a screenshot and ensures the trace is saved.

### Compiler mapping example
YAML
```yaml
- click:
    locator: role=button[name="Save"]
```
Generated TypeScript
```ts
await page.getByRole("button", { name: "Save" }).click();
```

## Selector helpers
- Parse the short locator syntax into Playwright calls.
  - data-testid=foo  → page.locator('[data-testid="foo"]')
  - role=button[name="Save"] → page.getByRole("button", { name: "Save" })
  - text="New Case" within role=region[name="Related"] → region scoped search
- Provide a region scope helper so steps can avoid global text matches.

## Assertion helpers
- url_contains and url_matches use expect(page).toHaveURL with timeout from config.
- visible_text uses a scoped locator and toBeVisible plus toContainText.
- api_check is optional. It issues a GET to the REST resource when instance URL and token are available. In the POC this can be disabled by omitting token. The step still passes if other assertions pass.

## Login flow and sessions
- First run of a suite will open the login host in a headed browser.
- User enters credentials and completes MFA once if required.
- After success Test Boss saves storage state to .auth/storage-state.default.json.
- The user can save more sessions for other profiles. Name them with tb session save --session qaprofile. Files are stored in .auth with that suffix.
- tb run can pick a session by name. This allows permission matrix tests without repeated logins.

## AI helpers

### Provider interface
```ts
export interface AIProvider {
  complete(params: {
    system: string;
    user: string;
    maxTokens?: number;
  }): Promise<string>;
}
```

### Locator advisor prompt outline
- System. You are a senior Salesforce test engineer. Produce a durable Playwright locator. Prefer data test id. Then role and accessible name. Avoid deep CSS. Return only the best locator in a compact syntax.
- User. Event type, raw selector from recorder, outerHTML of element, aria attributes, candidate text near the element.

### Assertion suggester prompt outline
- System. Propose one or two assertions that validate user visible outcome with low flake. Use url matches and visible text. Optionally suggest a read only API check. Return YAML snippet only.
- User. Step description, element kind, before and after url, small DOM diff.

### Step normalizer
- Reduce noisy events into higher value actions.
- Example. Multiple focus and key events collapse into one fill.

AI can be turned off with a flag. The recorder then keeps raw Playwright selectors.

## Reports and artifacts
- Playwright HTML report is stored under artifacts/last-run/playwright-report.
- Screenshots and traces are stored per test. The tool prints a local path after the run.
- tb report open launches the HTML report in the default browser.

## Error handling
- Clear console summary with step id, title, pass or fail, and duration.
- On failure show first error line and a path to screenshot and trace.
- Exit code is non zero if any step fails.

## Security and privacy
- Storage state files live under .auth with a gitignore.
- No secrets are written to YAML.
- AI requests include only small DOM snippets and never include full pages or credentials.
- The tool operates only on SIT or other non production orgs.

## Minimal happy path
1. `tb init`
2. `tb suite create "Accounts_Smoke"`
3. `tb step record --suite "Accounts_Smoke" --env sit`
   - Browser opens login host.
   - User logs in.
   - User records New Account create and Save.
   - Accept suggested assertions.
4. `tb run --suite "Accounts_Smoke" --env sit --headed`
5. `tb report open --suite "Accounts_Smoke"`

## Developer tasks

### CLI
- Implement commands listed above with Commander.
- Add a small spinner and clear prompts with Inquirer.

### Runtime
- YAML schema validation with zod.
- Locator parser and scope helper.
- Action and assertion executors with sensible waits.
- Storage state loader and writer.

### Recorder
- Use Playwright codegen as a source of events or a lightweight custom content script that captures clicks and inputs.
- Build a terminal review loop that shows AI suggestions and lets the user edit before save.

### AI layer
- Provider interface plus OpenAI compatible adapter using env vars TB_AI_API_KEY and TB_AI_BASE_URL.
- Three prompt files as listed above.
- Safe mode that redacts long attribute values.

### Templates
- Template suite with a login step and a blank step.
- .gitignore files for artifacts and auth.

## Acceptance criteria
- A tester can create a suite, record a login plus one simple CRUD flow, run it in a visible browser, and open the HTML report without touching Playwright directly.
- Storage state is saved and reused so the second run does not prompt for login.
- With AI on, at least one recorded step shows an upgraded locator or assertion compared to the raw capture.
- All outputs are local and the project is fully standalone.

## Example code snippets

### Short locator parser
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

### Action executor example
```ts
export async function execAction(page, action) {
  if (typeof action.navigate === "string") {
    const url = action.navigate;
    await page.goto(url, { waitUntil: "load" });
    return;
  }
  if (action.click) {
    const loc = toLocator(page, action.click.locator);
    await loc.waitFor({ state: "visible" });
    await loc.click();
    return;
  }
  if (action.fill) {
    const loc = toLocator(page, action.fill.locator);
    await loc.waitFor({ state: "visible" });
    await loc.fill(action.fill.value);
    return;
  }
}
```
