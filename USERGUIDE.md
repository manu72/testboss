# Test Boss POC User Guide

This guide provides instructions for manually testing the Proof of Concept (POC) of the Test Boss CLI. You will learn how to create, record, run, and report Playwright-based Salesforce UI test suites.

## Prerequisites

*   Mac OS
*   Node.js 20 or later
*   pnpm (install globally via `npm install -g pnpm`)
*   Test Boss repository cloned and dependencies installed (`pnpm install`).

## 1. Initialize the Project

This step sets up the necessary local configuration and creates the `suites` folder where your test suites will reside.

```bash
tb init
```

**Expected Output:**
*   Confirmation of `suites` directory creation.
*   Confirmation of `test-boss.config.json` file creation.

## 2. Create a New Test Suite

This command scaffolds a new test suite with a `suite.yaml` file, environment configuration, and starter steps.

```bash
tb suite create "Accounts_Smoke"
```

**Expected Output:**
*   Confirmation of suite creation at `suites/Accounts_Smoke`.
*   The `suites/Accounts_Smoke` directory will contain `suite.yaml`, `env/`, `.auth/`, and `steps/` folders.

## 3. Record Test Steps

This command opens a headed browser, allowing you to manually log into Salesforce and record your actions. The recorded actions will be captured (though currently only logged to console, not saved to YAML).

```bash
tb step record --suite "Accounts_Smoke" --env sit
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
tb run --suite "Accounts_Smoke" --env sit --headed
```

**Expected Output:**
*   Confirmation of Playwright spec file and temporary Playwright config generation.
*   A Playwright browser will open and execute the test based on your YAML steps.
*   Playwright test results will be displayed in the console.

## 5. Open the Playwright HTML Report

After running a test suite, you can open the generated Playwright HTML report to view detailed results.

```bash
tb report open --suite "Accounts_Smoke"
```

**Expected Output:**
*   The default web browser will open, displaying the Playwright HTML report for the `Accounts_Smoke` suite.
