# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Test Boss is a CLI tool for Mac OS that enables testers to create, record, and execute browser-based test suites against Salesforce applications using Playwright. The tool uses YAML files to define test steps and leverages AI assistance for improved selectors and assertions.

## Architecture

This is a pnpm monorepo with three main packages:

- **`packages/cli/`** - CLI commands using Commander.js, entry point via `tb` binary
- **`packages/runtime/`** - Core runtime logic for compiling YAML to Playwright tests and executing them
- **`packages/ai/`** - AI helpers for selector optimization and assertion suggestions

## Commands

### Build and Development
- `pnpm install` - Install all dependencies
- `npm run build` or `pnpm build` - Build TypeScript to dist/
- `npm run test` - Run Jest tests across all packages
- `npm run cli <args>` - Run the CLI directly during development

### CLI Commands (once built)
- `tb init` - Initialize Test Boss in current directory, creates suites/ folder
- `tb suite create <name>` - Create new test suite with boilerplate
- `tb step record --suite <name>` - Record browser interactions in headed mode
- `tb run --suite <name> [--headed]` - Execute test suite
- `tb report open --suite <name>` - Open Playwright HTML report
- `tb session save --suite <name> --session <name>` - Save browser storage state for reuse

## Core Concepts

### Suite Structure
Test suites are stored as folders under `suites/`:
```
suites/MySuite/
  suite.yaml          # Suite configuration
  env/sit.yaml        # Environment settings
  steps/*.yaml        # Test step definitions
  .auth/              # Stored browser sessions (gitignored)
  artifacts/          # Test results and reports
```

### Step YAML Format
Steps use a simple YAML schema:
```yaml
id: "010_create_account"
title: "Create Account"
actions:
  - navigate: "/lightning/o/Account/list"
  - click:
      locator: role=button[name="New"]
  - fill:
      locator: data-testid=account-name
      value: "Test Account"
assertions:
  - url_matches: "/lightning/r/Account/[a-zA-Z0-9]{18}/view"
```

### Locator Syntax
The runtime supports a shorthand locator syntax:
- `data-testid=foo` → `page.locator('[data-testid="foo"]')`
- `role=button[name="Save"]` → `page.getByRole("button", { name: "Save" })`
- `text="New Case"` → `page.getByText("New Case", { exact: true })`

## Key Implementation Details

### Runtime Flow
1. Loads suite.yaml and environment configuration
2. Compiles YAML steps into a temporary Playwright spec file
3. Executes the generated spec with proper waits and error handling
4. Saves artifacts (screenshots, traces, reports) to suite's artifacts/ folder

### Storage State Management
- First run opens browser for manual Salesforce login
- Browser storage state is saved to `.auth/storage-state.default.json`
- Subsequent runs reuse this state to skip MFA
- Multiple named sessions supported for different user profiles

### AI Integration
- Optional AI provider interface for selector improvement and assertion suggestions
- Operates on small DOM snippets during recording, never full pages
- Can be disabled with `--ai off` flag
- Supports OpenAI-compatible APIs via environment variables

## Testing Strategy

- Jest for unit/integration tests in each package
- Test files follow pattern: `**/*.test.ts`
- Coverage collection from packages/*/src/**/*.ts
- Playwright for end-to-end testing of generated specs

## Key Files to Understand

- `packages/runtime/src/compiler.ts` - YAML to Playwright spec compilation
- `packages/runtime/src/selectors.ts` - Locator parsing and conversion
- `packages/runtime/src/asserts.ts` - Assertion execution helpers
- `packages/cli/src/commands/` - Individual CLI command implementations

## Environment Variables

- `TB_AI_API_KEY` - API key for AI provider
- `TB_AI_BASE_URL` - Base URL for AI provider (defaults to OpenAI)