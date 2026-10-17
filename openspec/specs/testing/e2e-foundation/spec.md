# testing/e2e-foundation Specification

## Purpose
Defines the guarantees the end-to-end harness provides, so that agents working in separate
worktrees in parallel can trust a green run as evidence rather than a coincidence.

## Requirements

### Requirement: Each worktree gets its own database

The harness SHALL provision a separate disposable database for each worktree, so that worktrees
running concurrently cannot observe each other's data.

#### Scenario: Concurrent worktrees do not interfere

- **WHEN** two worktrees run the suite at the same time
- **THEN** each uses its own database
- **AND** neither sees rows created by the other

#### Scenario: A worktree reuses its own database

- **WHEN** the same worktree runs the suite again
- **THEN** it uses the same database it used before, without disturbing another worktree

### Requirement: A run starts from a known data state

The harness SHALL reset the data it owns before running scenarios, so a result never depends on what
a previous run left behind, and SHALL provide the fixture data a scenario needs without depending on
an unavailable external provider.

#### Scenario: Repeated runs agree

- **WHEN** the suite runs twice in a row
- **THEN** both runs report the same result
- **AND** no row created by the first run is visible to the second

#### Scenario: A scenario gets a verified account without email delivery

- **WHEN** a scenario needs an account that can sign in
- **THEN** the harness provides one directly, without going through email delivery, which is
  unconfigured outside tests

### Requirement: One command provisions and runs the environment

The harness SHALL expose a single documented command that provisions the database, applies
migrations, resets data, and runs the suite, and SHALL refuse to run against a non-local host or a
database whose name does not end in `_test`.

#### Scenario: A fresh worktree runs from one command

- **WHEN** an agent runs the documented command in a worktree whose database does not exist yet
- **THEN** the harness creates and migrates it
- **AND** the suite runs

#### Scenario: A remote host is refused

- **WHEN** the configured test database is not on a local host
- **THEN** the harness refuses before running anything
- **AND** reports why

#### Scenario: A database that is not disposable is refused

- **WHEN** the configured test database name does not end in `_test`
- **THEN** the harness refuses before running anything
- **AND** reports why

### Requirement: A failing scenario is reported as a failure

The harness SHALL report a failing scenario as a failing run with a non-zero exit status, so a
deliberate failure is detectable and no failure is silently absorbed.

#### Scenario: A broken scenario fails the run

- **WHEN** a scenario's assertion is deliberately broken
- **THEN** the run fails, names the scenario, and exits non-zero

#### Scenario: The failure is reproducible

- **WHEN** the same broken scenario is run again
- **THEN** it fails the same way, so the detection is not incidental

### Requirement: The mobile client has device-level end-to-end coverage

The mobile client SHALL have device-level end-to-end flows, runnable by a documented command,
covering the behavior that exists today rather than behavior that is planned.

#### Scenario: Sign-in is the first screen

- **WHEN** the app is launched with no stored session
- **THEN** the sign-in screen is presented

#### Scenario: Rejected credentials keep the user on sign-in

- **WHEN** a user submits credentials the API rejects
- **THEN** the sign-in screen remains and an invalid-credentials message is shown

#### Scenario: Accepted credentials reach the authenticated screen

- **WHEN** a user submits credentials the API accepts
- **THEN** the authenticated screen is presented

### Requirement: The conventions are documented

The repository SHALL document how an agent adds a scenario for its acceptance criteria, how a
failure is diagnosed, and the command and result every implementation-task handoff must carry.

#### Scenario: An agent finds the pattern

- **WHEN** an agent needs to add E2E coverage for an acceptance criterion
- **THEN** the repository documents the pattern to follow and the exact command to run
- **AND** states what evidence the handoff must include
