# Test Boss POC User Guide

This guide provides instructions for manually testing the Proof of Concept (POC) of the Test Boss CLI. You will learn how to create, record, run, and report Playwright-based Salesforce UI test suites.

## Prerequisites

*   Mac OS
*   Node.js 20 or later
*   pnpm (install globally via `npm install -g pnpm`)

## Setup and Installation

1.  **Clone the repository:**
    ```bash
    git clone <repository-url> # Replace with the actual repository URL
    cd test-boss
    ```

2.  **Install dependencies:**
    ```bash
    pnpm install
    ```

3.  **Build the CLI package:** This compiles the TypeScript code into JavaScript.
    ```bash
    pnpm build
    ```

4.  **Install Playwright browsers:** This downloads the browser binaries needed for testing.
    ```bash
    npx playwright install
    ```

5.  **Run the CLI:** Since this is a monorepo setup, use one of these approaches:

    **Option A: Direct execution (Recommended)**
    ```bash
    npm run cli -- <command>
    # Examples:
    npm run cli -- init
    npm run cli -- suite create "MyTest"
    ```

    **Option B: Node execution**
    ```bash
    node packages/cli/dist/index.js <command>
    # Examples:
    node packages/cli/dist/index.js init
    node packages/cli/dist/index.js suite create "MyTest"
    ```

    **Option C: Global linking (if preferred)**
    ```bash
    pnpm link --global packages/cli
    # Then use: tb <command>
    ```
    *Note: If linking fails due to permissions, try with `sudo` or configure pnpm for global installations.*

## 1. Initialize the Project

This step sets up the necessary local configuration and creates the `suites` folder where your test suites will reside.

```bash
npm run cli -- init
# OR: node packages/cli/dist/index.js init
# OR: tb init (if globally linked)
```

**Expected Output:**
*   Confirmation of `suites` directory creation.
*   Confirmation of `test-boss.config.json` file creation.

## 2. Create a New Test Suite

This command scaffolds a new test suite with a `suite.yaml` file, environment configuration, and starter steps.

```bash
npm run cli -- suite create "Accounts_Smoke"
# OR: node packages/cli/dist/index.js suite create "Accounts_Smoke"
# OR: tb suite create "Accounts_Smoke" (if globally linked)
```

**Expected Output:**
*   Confirmation of suite creation at `suites/Accounts_Smoke`.
*   The `suites/Accounts_Smoke` directory will contain `suite.yaml`, `env/`, `.auth/`, and `steps/` folders.

## 3. Record Test Steps

This command opens a headed browser, allowing you to manually log into Salesforce and record your actions. The recorded actions will be captured (though currently only logged to console, not saved to YAML).

```bash
npm run cli -- step record --suite "Accounts_Smoke" --env sit
# OR: node packages/cli/dist/index.js step record --suite "Accounts_Smoke" --env sit
# OR: tb step record --suite "Accounts_Smoke" --env sit (if globally linked)
```

**Instructions during recording:**
1.  A Playwright browser will open to the Salesforce login host.
2.  Manually log in to Salesforce.
3.  Perform the actions you want to record (e.g., navigate to Accounts, create a new account, save it).
4.  Close the Playwright browser window when you are finished recording.

**Expected Output:**
*   A Playwright browser window will open.
*   After closing the browser, the raw Codegen output will be printed to the console. (Note: In this POC, the steps are not yet saved to YAML files automatically.)

## 4. Run the Test Suite

This command compiles the YAML steps defined in your suite into a transient Playwright spec and executes it in a browser. The `--headed` option makes the browser visible during execution.

```bash
npm run cli -- run --suite "Accounts_Smoke" --env sit --headed
# OR: node packages/cli/dist/index.js run --suite "Accounts_Smoke" --env sit --headed
# OR: tb run --suite "Accounts_Smoke" --env sit --headed (if globally linked)
```

**Expected Output:**
*   Confirmation of Playwright spec file and temporary Playwright config generation.
*   A Playwright browser will open and execute the test based on your YAML steps.
*   Playwright test results will be displayed in the console.

## 5. Open the Playwright HTML Report

After running a test suite, you can open the generated Playwright HTML report to view detailed results.

```bash
npm run cli -- report open --suite "Accounts_Smoke"
# OR: node packages/cli/dist/index.js report open --suite "Accounts_Smoke"
# OR: tb report open --suite "Accounts_Smoke" (if globally linked)
```

**Expected Output:**
*   The default web browser will open, displaying the Playwright HTML report for the `Accounts_Smoke` suite.

## Troubleshooting

### Build Issues
If you encounter build errors:
```bash
# Clean and rebuild
rm -rf dist packages/*/dist
pnpm build
```

### Missing Dependencies
If you see import errors or missing module errors:
```bash
# Reinstall all dependencies
rm -rf node_modules packages/*/node_modules
pnpm install
pnpm build
```

### Playwright Browser Issues
If Playwright fails to launch browsers:
```bash
# Reinstall Playwright browsers
npx playwright install
```

### CLI Command Not Found
If `tb` command is not found after global linking:
- Use the direct execution methods: `npm run cli --` or `node packages/cli/dist/index.js`
- Check your PATH and pnpm global configuration
- Verify the build completed successfully

### Permission Issues
If you encounter permission errors:
- Try using `sudo` with global installation commands
- Or configure pnpm to use a user directory for global packages
