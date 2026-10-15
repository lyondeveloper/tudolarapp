---
name: tdd-red-first
description: Enforce a verified test-first red-green-refactor workflow before implementing any TUDOLAR feature or behavior change.
argument-hint: "[feature or behavior]"
triggers:
  - user
  - model
---

# TDD Red First

Use this workflow before implementing every feature, bug fix, or behavior change in this repository. Do not start production-code implementation until the new test has been run and its red failure has been checked.

## 1. Define the behavior

- Read the repository `AGENTS.md`, inspect the existing code/test conventions, and identify the exact observable behavior and acceptance criteria.
- If the requested behavior or its contract is ambiguous, ask one focused question before writing a test. Do not invent endpoint shapes, error semantics, or business rules.
- Select the smallest appropriate test layer: unit tests for domain rules/use cases; integration tests for adapters and persistence; e2e tests for HTTP contracts and critical flows. Add other layers when the behavior crosses those boundaries.

## 2. Write the test first

- Add a focused automated test that states what the system must do, including relevant edge cases. Prefer observable outputs and externally meaningful behavior over implementation details.
- Do not edit production source while writing the test. If the test runner or minimal test harness does not yet exist, set up only the test infrastructure needed to run it; do not implement the feature as part of that setup.
- Avoid mocking the unit or behavior under test. Mock only external boundaries when needed, and ensure mocks cannot make the expected behavior pass without exercising the target.
- Do not use snapshots or assertions that merely prove a method was called when the user-visible result can be asserted directly.

## 3. Verify a meaningful red phase

- Run the narrowest command that executes the new test, using the package manager and scripts already adopted by the repo.
- Read the actual output. Red is valid only when the test runner executes the relevant assertion and it fails because the requested behavior is absent or incorrect.
- A syntax/type error, unresolved import/module, broken fixture, missing provider, test-runner/configuration failure, timeout, or unrelated pre-existing failure is not a valid red result. Fix the test/setup problem without implementing the feature, then rerun the test.
- Never change production code, weaken the expectation, skip the test, or deliberately break the setup to manufacture a red result.

## 4. Implement, turn green, and refactor

- Once red is verified, implement the smallest production change that satisfies the test while following `AGENTS.md` architecture and security rules.
- Rerun the same focused test and confirm it passes. Then refactor if useful without changing behavior and rerun the focused test plus the relevant suite/type/lint checks.
- If the test unexpectedly passes before implementation, investigate whether it actually exercises the behavior; improve the assertion or test boundary and repeat the red phase.
- If the test cannot be run in this environment, report the exact blocker and do not claim the red/green workflow is verified.

## 5. Architecture review

Before completing a change that adds or moves responsibilities across layers, inspect the changed files and their imports against `AGENTS.md`:

- HTTP DTOs and transport validation stay in inbound adapters. Map them to application input/command types at the adapter boundary; application/domain code must not import HTTP DTOs.
- Application use-case input/output contracts and ports live in `application/`; domain rules and pure domain helpers live in `domain/`; adapters translate protocols and implement external boundaries.
- Keep application services focused on coordinating use cases and ports. Move non-trivial pure helpers and unrelated contracts to the layer that owns them; do not move business logic into an adapter just to shorten a service file.
- Avoid splitting code into empty or ceremonial files/layers; each extracted unit should have a clear responsibility.
- For a behavior-preserving refactor, preserve existing behavior and run relevant existing tests; do not manufacture a new red test for a file move alone. If behavior changes, follow the full red-green steps above.

## 6. Report evidence

For each feature, report:

1. The test(s) added and the behavior they cover.
2. The exact targeted command and the red result, including why the failure was expected.
3. The implementation summary and the green result after implementation.
4. Any broader tests, type checks, or lint checks run, and any outstanding failures or limitations.
