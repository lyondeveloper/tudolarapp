# Tasks

## 1. Stitch Design Mapping & E2E Scenarios (Red First)

- [x] 1.1 Document the complete Stitch design mapping (`projects/14764001563531497625` — *"TUDOLAR P2P Marketplace Prototype"*), screens, components, tokens, navigation flows, and ADR adaptations in `docs/design/stitch-mobile-mapping.md`, and verify the file exists with all 9 screens mapped.
- [x] 1.2 Add Maestro end-to-end scenario `apps/mobile/e2e/04-stitch-marketplace-flows.yaml` covering the Stitch marketplace discovery, search, offer detail safety handshake modal, chat, post-exchange confirmation, and publish offer preview flows, and verify it fails in red phase against the current placeholder `/home` (`MAESTRO_CLI_NO_ANALYTICS=1 maestro test apps/mobile/e2e/04-stitch-marketplace-flows.yaml`).

## 2. Marketplace Domain Catalog & Preview Dataset (TDD Red-First)

- [x] 2.1 Write unit tests in `apps/mobile/src/features/marketplace/domain/catalog.spec.ts` and `apps/mobile/src/features/marketplace/domain/preview-data.spec.ts` verifying the 5 canonical MVP pairs (`ADR-0009`), pure bolivar equivalence/quote calculation (`ADR-0008`, `ADR-0010`), deterministic offer filtering (`ADR-0015`), offer draft validation (`0 <= margin < 100`, `minAmount > 0`, `minAmount <= maxAmount`), and absence of Zelle, star ratings, reputation scores, or earnings labels (`ADR-0013`, `ADR-0018`); run `npm --prefix apps/mobile test -- catalog.spec` and `npm --prefix apps/mobile test -- preview-data.spec` to confirm red failure.
- [x] 2.2 Implement `apps/mobile/src/features/marketplace/domain/catalog.ts` and `apps/mobile/src/features/marketplace/domain/preview-data.ts`, and verify `npm --prefix apps/mobile test -- catalog.spec` and `npm --prefix apps/mobile test -- preview-data.spec` pass.

## 3. Reusable Civic Trust Exchange UI Components (TDD Red-First)

- [x] 3.1 Write component specs in `apps/mobile/src/features/marketplace/components/civic-notice-banner.spec.tsx`, `market-node-banner.spec.tsx`, `offer-card.spec.tsx`, `bottom-dock.spec.tsx`, and `safety-handshake-modal.spec.tsx` verifying token-role usage (no literal hex colors), `code-num` tabular figures on monetary values, modal toggling on `MarketNodeBanner`, 4-item navigation on `BottomDock` (`Ofertas`, `Buscar`, `Acuerdos`, `Publicar`), and checkbox gating on `SafetyHandshakeModal`; run `npm --prefix apps/mobile test -- features/marketplace/components` to confirm red failure.
- [x] 3.2 Implement `civic-notice-banner.tsx`, `market-node-banner.tsx`, `offer-card.tsx`, `bottom-dock.tsx`, and `safety-handshake-modal.tsx` under `apps/mobile/src/features/marketplace/components/` using `gluestack-ui` primitives and Civic Trust Exchange tokens, and verify `npm --prefix apps/mobile test -- features/marketplace/components` passes.

## 4. Stitch Auth Screens: Enhanced Sign-In & Community Registration (TDD Red-First)

- [x] 4.1 Write unit/render tests in `apps/mobile/src/features/auth/sign-in-form.spec.tsx` and `apps/mobile/src/features/auth/register-form.spec.tsx` (plus `apps/mobile/src/__tests__/register-screen.spec.tsx`) verifying the Stitch sign-in elements (Ciudad Ojeda node badge, passkey entry card, privacy notice, `/register` link, preserved `sign-in-identifier`/`sign-in-password`/`sign-in-submit` testIDs) and React Hook Form validation on `/register` (required fields, 3-point *Pacto de Confianza Ojeda* checkbox, preview submission notice, no mandatory `Cédula` per `ADR-0013`); run `npm --prefix apps/mobile test -- register` to confirm red failure.
- [x] 4.2 Update `apps/mobile/src/features/auth/sign-in-form.tsx` and `apps/mobile/src/app/sign-in.tsx`, and create `apps/mobile/src/features/auth/use-register-form.ts`, `apps/mobile/src/features/auth/register-form.tsx`, and `apps/mobile/src/app/register.tsx`; verify `npm --prefix apps/mobile test -- sign-in` and `npm --prefix apps/mobile test -- register` pass while keeping `app-shell.anonymous.spec.tsx` green.

## 5. Stitch Marketplace Screens: Discovery (`/home`), Manual Search (`/search`), and Offer Detail (`/offers/[id]`) (TDD Red-First)

- [x] 5.1 Write render and interaction specs in `apps/mobile/src/__tests__/home-marketplace.spec.tsx`, `apps/mobile/src/__tests__/search-screen.spec.tsx`, and `apps/mobile/src/__tests__/offer-detail-screen.spec.tsx` verifying:
  - `/home` renders `Signed in` + `user.displayName` from `useCurrentUserQuery()`, the Ciudad Ojeda market banner, deterministic filter chips, list/map toggle, offer cards, non-custody notice, and `BottomDock` without rendering `password`, `Home`, or `Explore`.
  - `/search` filters offers deterministically via React Hook Form controls and displays the `ADR-0015` AI deferral notice.
  - `/offers/[id]` renders tabular rate/limits, safe corridor details, and requires acknowledging `SafetyHandshakeModal` before navigating to `/chat/[id]`.
  Run `npm --prefix apps/mobile test -- home-marketplace`, `search-screen`, and `offer-detail-screen` to confirm red failure.
- [x] 5.2 Update `apps/mobile/src/app/home.tsx` and create `apps/mobile/src/app/search.tsx` and `apps/mobile/src/app/offers/[id].tsx` (along with supporting hooks/presentational views under `apps/mobile/src/features/marketplace/`), and verify `npm --prefix apps/mobile test -- home`, `search-screen`, and `offer-detail-screen` pass.

## 6. Stitch Publish Offer (`/publish`), Contextual Chat (`/chat/[id]`), and Post-Exchange Confirmation (`/agreements/[id]/confirm`) (TDD Red-First)

- [x] 6.1 Write unit and render specs in `apps/mobile/src/features/marketplace/use-publish-offer-form.spec.ts`, `apps/mobile/src/__tests__/publish-screen.spec.tsx`, `apps/mobile/src/__tests__/chat-screen.spec.tsx`, and `apps/mobile/src/__tests__/agreement-confirm-screen.spec.tsx` verifying:
  - `/publish` validates canonical pair, rate, optional margin (`0 <= margin < 100`, never labeled as "earnings"), min/max limits, payment rails, and safe meeting point via React Hook Form, computes bolivar equivalence in `code-num`, and shows an explicit preview-mode notice on submit.
  - `/chat/[id]` renders the offer context pill, non-custody banner, *Pacto de Encuentro* card, verified meeting point picker modal, message composer (React Hook Form), and *Reportar Incidencia* modal.
  - `/agreements/[id]/confirm` renders the *Pacto Cumplido* breakdown in `code-num`, final civic verification checklist, and incident report trigger without any 5-star rating or reputation widget (`ADR-0013`).
  Run `npm --prefix apps/mobile test -- publish`, `chat-screen`, and `agreement-confirm-screen` to confirm red failure.
- [x] 6.2 Implement `apps/mobile/src/features/marketplace/use-publish-offer-form.ts`, `apps/mobile/src/app/publish.tsx`, `apps/mobile/src/app/chat/[id].tsx`, and `apps/mobile/src/app/agreements/[id]/confirm.tsx`, and verify all unit/render tests pass.

## 7. Full Quality & E2E Verification Gate

- [x] 7.1 Update `apps/mobile/README.md` to document the implemented Stitch routes, component structure, and preview-data boundary, and verify all screen source files pass the zero-literal-hex token check (`npm --prefix apps/mobile test`).
- [x] 7.2 Run mobile and API verification suites (`npm --prefix apps/mobile test`, `npx --prefix apps/mobile tsc --noEmit`, `npx --prefix apps/mobile expo lint`, `npm --prefix apps/api test`, `npm --prefix apps/api run test:e2e`, `npm --prefix apps/api run build`, `npx --prefix apps/api eslint "{src,apps,libs,test}/**/*.ts"`), rebuild/bundle the iOS app, and execute all Maestro E2E flows (`npm --prefix apps/mobile run e2e` covering `01` through `04`).

## Workflow follow-up

- Validate the change with `openspec validate t15-stitch-mobile-ui --strict`.
- Archive the change with `/openspec-archive-change` after all tasks are complete and verified, and update the Notion T15 status and comment.
