# Test Boss Project Overview

Test Boss is a standalone Command Line Interface (CLI) tool designed for Mac OS. Its primary purpose is to empower quality assurance testers to efficiently create, record, and execute browser-based test suites against Salesforce applications. The project leverages Playwright for robust browser automation and incorporates lightweight AI assistance to enhance test stability through improved selectors and assertion suggestions. Test suites are stored locally on disk as organized folders containing YAML step files, ensuring a transparent and manageable testing workflow.

## Architecture

Test Boss is structured as a pnpm monorepo, comprising three distinct packages:
*   **`packages/cli`**: Implements the command-line interface using Commander.js.
*   **`packages/runtime`**: Contains the core logic for reading suite YAML files, compiling them into Playwright specs, and executing test actions with consistent waits and error reporting.
*   **`packages/ai`**: Provides AI helpers for suggesting improved locators and assertions, with a generic provider interface supporting OpenAI-compatible or local models.

## Building and Running

### Prerequisites
*   Mac OS
*   Node.js 20 or later
*   pnpm (install globally via `npm install -g pnpm`)

### Setup and Installation
1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd test-boss
    ```
2.  **Install dependencies:**
    ```bash
    pnpm install
    ```

### Minimal Happy Path (Quick Start)
1.  **Initialize the project:** Creates local configuration and a `suites` folder.
    ```bash
    tb init
    ```
2.  **Create a new test suite:** Scaffolds a new suite with `suite.yaml`, environment configuration, and starter steps.
    ```bash
    tb suite create "Accounts_Smoke"
    ```
3.  **Record test steps:** Opens a headed browser, guides the user to log in, and captures actions.
    ```bash
    tb step record --suite "Accounts_Smoke" --env sit
    ```
    *   A browser will open to the Salesforce login host.
    *   Log in manually.
    *   Record actions (e.g., creating a new account and saving).
    *   Accept suggested assertions.
4.  **Run the test suite:** Compiles YAML steps into a transient Playwright spec and executes it in a headed browser.
    ```bash
    tb run --suite "Accounts_Smoke" --env sit --headed
    ```
5.  **Open the Playwright HTML report:**
    ```bash
    tb report open --suite "Accounts_Smoke"
    ```

### Testing
*   **Unit & Integration Tests:** Jest is used for comprehensive unit and integration testing of individual modules and functions across all packages.
*   **End-to-End Tests:** Playwright's test runner is utilized for executing the generated end-to-end browser automation tests.

## Development Conventions

*   **Language:** TypeScript is used throughout the project.
*   **Package Manager:** pnpm is used for monorepo management.
*   **Test Suites:** Test suites are defined using YAML files, providing a structured and human-readable format for test steps and assertions.
*   **Browser Automation:** Playwright is the chosen library for browser control, recording, and reporting.
*   **CLI Framework:** Commander.js is used for building the command-line interface.
*   **AI Integration:** AI helpers are integrated with a provider-neutral interface, allowing flexibility in AI model usage.
*   **Security:** Storage state files are stored under `.auth` and are excluded from Git via `.gitignore`. No secrets are written to YAML files.
