# Spec Delta

## Purpose

Defines the token layer the TUDOLAR mobile client renders from — palette, typography, spacing,
radius, and elevation — so every screen presents the approved brand instead of placeholder values.

## ADDED Requirements

### Requirement: Screens render from the approved brand palette

The mobile client SHALL render its actions and notices from the approved brand palette rather than
from literal or placeholder values: institutional deep blue for primary actions, emerald sage for
affirmative actions, and the preventative amber set for non-custody and safety notices.

#### Scenario: A primary action renders in the brand blue

- **WHEN** a screen presents its primary action, such as the sign-in submit control
- **THEN** the control renders on `#0F4C81`

#### Scenario: An affirmative action renders in the brand green

- **WHEN** a screen presents an affirmative action, such as confirming a completed exchange
- **THEN** the control renders on `#059669`

#### Scenario: A warning notice renders in the amber set

- **WHEN** a screen presents a non-custody or physical-safety notice
- **THEN** it renders on the amber tint `#FEF3C7` with a `#F59E0B` border and `#92400E` text

### Requirement: Light presentation is the default

The mobile client SHALL present its light palette by default and SHALL keep a selectable dark
presentation available, so a dark palette can be authored later without reworking components.

#### Scenario: The client starts in light presentation

- **WHEN** the app starts without an explicit presentation selected
- **THEN** screens render with the light palette

#### Scenario: The dark presentation remains selectable

- **WHEN** the app is started with the dark presentation selected
- **THEN** screens render from the dark values and no screen breaks

### Requirement: Typography follows the approved scale and typeface

The mobile client SHALL render its text in the approved typeface using the approved scale, and
SHALL render monetary values with tabular figures so amounts and rates align when compared.

#### Scenario: Text renders in the approved typeface

- **WHEN** a screen renders a heading, body text, or a field label
- **THEN** it renders in Plus Jakarta Sans

#### Scenario: Headings use the approved scale

- **WHEN** a screen renders a headline
- **THEN** it uses the approved headline size and weight for its level rather than an arbitrary one

#### Scenario: Monetary values use tabular figures

- **WHEN** a screen renders an amount, a rate, or a limit
- **THEN** it uses the tabular numeric style so figures align

### Requirement: Screens render from tokens rather than literal values

The mobile client SHALL obtain colour, spacing, radius, and typography from the token layer, so
that changing a token changes what screens render without editing those screens.

#### Scenario: Changing a token changes the rendering

- **WHEN** a token's value is changed
- **THEN** every screen using that token renders the new value without any screen being edited

#### Scenario: An approved semantic role is addressable by name

- **WHEN** a component needs an approved role, such as a surface, an outline, or a muted text colour
- **THEN** it can reference that role by name and renders the approved value
