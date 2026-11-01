# Design

## Context

See `proposal.md` for motivation. The mobile application currently gates `/home` behind `RequireAuthenticated` and directs cold starts directly to an unstyled `/sign-in` screen. Stitch screen 1.1 defines a complete civic trust header, trust pills, elevated biometrics button, card container, and privacy guarantee. Stitch screen 2.1 defines marketplace discovery with offer cards, active market node banner, and bottom navigation.

## Goals / Non-Goals

**Goals:**
- Enable immediate, frictionless marketplace browsing (`/home`) for both guest and authenticated users.
- Anchor `BottomDock` as a true mobile bottom tab bar across screens with safe area inset handling.
- Transform `/sign-in` into an elevated, modern mobile screen honoring the Stitch design system tokens (Civic Trust Exchange: `#0F4C81`, `#059669`, `#FEF3C7`), comfortable touch targets (50px), and clear typography.
- Provide a direct guest escape hatch from `/sign-in` to `/home`.

**Non-Goals:**
- Modifying backend authentication logic, session handling, or token verification.
- Integrating native WebAuthn/Passkey cryptographic ceremony (scheduled for T16).
- Creating new backend API endpoints.

## Decisions

1. **Guest Browsing on `/home` vs. Strict Auth Gate**:
   - *Decision*: Remove `RequireAuthenticated` from `HomeScreen` so anonymous visitors can see active Ciudad Ojeda offers and market rates. Protect only write/coordination actions (e.g. attempting to publish or start a chat prompts sign-in).
   - *Rationale*: P2P marketplaces rely on transparent discovery. Forcing registration before seeing a single offer creates immediate drop-off and confusion.
   - *Alternative Considered*: Keep `/home` locked and build a separate `/landing` screen. Rejected because `/home` is already the discovery feed and duplicating it introduces redundant state.

2. **Bottom Dock Layout Architecture**:
   - *Decision*: Place `<BottomDock>` outside the scrollable area at the bottom of the container with safe-area bottom padding.
   - *Rationale*: In mobile navigation, tabs must remain accessible to the user's thumb at all times without scrolling.
   - *Alternative Considered*: Floating dock inside ScrollView. Rejected because it moved with content and sat awkwardly at the top of the feed.

3. **Card-Based Mobile Elevation & Touch Targets**:
   - *Decision*: Style inputs with `min-h-[50px]`, `rounded-xl`, soft border and background, wrap authentication in an elevated card (`bg-white rounded-2xl p-6 shadow-sm border border-slate-100`), and add a prominent hero card with trust badges.
   - *Rationale*: Matches iOS and Android human interface guidelines for fintech apps and reflects the Stitch 1.1 prototype aesthetic.

## Risks / Trade-offs

- **[Risk]** Existing tests that asserted `RequireAuthenticated` redirects anonymous users on `/home` might fail.
  - *Mitigation*: Update `home-marketplace.spec.tsx` and `app-shell.anonymous.spec.tsx` to align with the revised guest discovery and sign-in escape scenario while keeping all contractual checks intact.
