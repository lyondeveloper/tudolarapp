# Proposal

## Why

The current mobile client implementation renders an unstyled, bare wireframe sign-in form as a blocking wall on initial launch, preventing users from viewing the marketplace, exchange pairs, and safe meeting corridors. The inputs and buttons lack modern mobile fintech ergonomics (heights under 40px, default harsh borders, no container elevation or breathing room, no logo or visual hierarchy). In-person P2P discovery requires an immediate, welcoming marketplace feed and a polished, civic-trust aesthetic inspired by the Stitch designs.

## What Changes

- **Marketplace First & Guest Discovery**: Remove the blocking authentication gate on `/home` so users can immediately explore Ciudad Ojeda marketplace offers, exchange pairs, and safe meeting points before signing in.
- **Branded Header & Civic Hero Card**: Add TUDOLAR branding, an active municipal node pill (`Ciudad Ojeda` with pulsating status indicator), and a 3-pillar trust card (`Cifrado Local`, `Puntos Céntricos`, `Sin Custodia`) on `/sign-in`.
- **Fintech Card Ergonomics**: Transform `/sign-in` into an elevated card layout with 50px touch targets, rounded-xl inputs, soft background surfaces (`bg-slate-50`), clear typography hierarchy, and a distinct civic-blue primary action button.
- **Biometric / Passkey Section**: Elevate the passkey and biometric quick-access button with icon and descriptive benefit copy.
- **Guest Exploration Escape**: Provide an explicit "Continuar como invitado / Explorar ofertas" action on `/sign-in` linking directly to `/home`.
- **Bottom Dock Anchoring**: Fix the `BottomDock` navigation bar to the bottom of the viewport with safe area padding, acting as a genuine mobile tab bar instead of floating at the top of the feed.

### Out of Scope
- Backend schema changes or database migrations.
- WebAuthn cryptographic ceremony execution (deferred to T16).
- Modifying backend authentication logic or token issuance.

## Capabilities

### Modified Capabilities
- `mobile/stitch-marketplace-ui`: Refines the marketplace discovery to support guest viewing on `/home`, positions the bottom dock at the bottom of the viewport, and enhances `/sign-in` with branded civic trust presentation, guest navigation, and elevated mobile styling.

## Impact

- Affected module: `apps/mobile/src/` (`app/home.tsx`, `app/sign-in.tsx`, `features/auth/sign-in-form.tsx`, `features/marketplace/components/bottom-dock.tsx`).
- No API breaking changes.
- Mobile test suite updated to verify guest discovery and enhanced sign-in presentation.
- Source task: Notion T15 / Mobile UX Feedback.
