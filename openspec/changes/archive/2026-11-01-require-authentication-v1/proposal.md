# Proposal: Mandatory Authentication & Clean Marketplace Feed for V1

## Why

Per product direction for V1, anonymous guest browsing of offers and marketplace screens is strictly disabled to enforce verification and trust. Furthermore, the `/home` screen had become cluttered with multi-row filter pills and an unnecessary "Lista / Mapa Ojeda" switcher. Moving filters into an accessible modal and removing the map toggle leaves `/home` focused, clean, and intuitive.

## What Changes

- **Reinstate Authentication Gate on `/home`**: Wrap `/home` with `<RequireAuthenticated>`, ensuring anonymous visitors are automatically redirected to `/sign-in`.
- **Reinstate Authentication Gate on `/profile`**: Wrap `/profile` with `<RequireAuthenticated>`, ensuring anonymous visitors are automatically redirected to `/sign-in` and eliminating guest profile state.
- **Remove Guest Escape on `/sign-in`**: Remove the `sign-in-guest-browse` button ("Explorar ofertas de Ciudad Ojeda como invitado →") from `SignInForm`.
- **Remove Guest Banner on `/home`**: Remove the guest welcome banner from `/home` since anonymous visitors will never reach the rendered marketplace.
- **Remove "Lista / Mapa Ojeda" Switcher**: Eliminate the view mode switcher from `/home` so the screen is purely dedicated to the offer feed.
- **Move Pair Filters to a Filter Modal**: Replace the fixed multi-row pair pills on `/home` with a compact search/filter trigger bar that opens a filter modal (or navigates to `/search`), allowing the user to select canonical pairs and view active filter indicators.
- **Update Mobile Test Suites**: Update existing e2e/unit tests in `apps/mobile` (`home-marketplace.spec.tsx`, `sign-in-form.spec.tsx`, `profile-screen.spec.tsx`, `app-shell.anonymous.spec.tsx`) to assert authentication requirements, removal of guest bypasses, removal of map toggle, and filter modal interactions.

## Capabilities

### Modified Capabilities
- `mobile/stitch-marketplace-ui`: Require authentication via `<RequireAuthenticated>` on `/home` and `/profile`, remove guest home prompt, remove `sign-in-guest-browse` control from `/sign-in`, remove map toggle on `/home`, and move pair filters into a modal.

## Impact

- Affected module: `apps/mobile/src/app/`, `apps/mobile/src/features/auth/`, `apps/mobile/src/features/marketplace/`.
- No backend API changes or database migrations required.
