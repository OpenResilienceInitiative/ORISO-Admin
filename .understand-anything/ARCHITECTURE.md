# ORISO Admin Architecture Summary

## Purpose

`ORISO-Admin` is the operational admin dashboard for the ORISO Online-Beratung platform. It manages tenants, tenant settings, agencies, counsellors, agency admins, tenant admins, platform admins, topics, account invites and external inbound links, DPA/DPIA legal workflows, profile settings, global/server settings, statistics, and audit/log views. It also hosts public onboarding surfaces: tenant-admin onboarding, counsellor onboarding, and password reset.

The application is a React/Vite single-page app served under `/admin`. It depends on Keycloak-compatible auth endpoints (proxied through a small auth BFF) and ORISO backend services exposed under `/service/...`.

## Current Stack

- React 19 + TypeScript 5
- Vite 8 build/dev server, Node `^22.12.0`
- React Router v7 routing
- TanStack React Query v5 for server-state fetching and mutations
- MUI v9 (+ Emotion) and Ant Design v5 component libraries, unified by an M3 theme bridge (`src/theme/antdM3Theme.ts`, `src/theme/orisoMuiTheme.ts`); antd requires `@ant-design/v5-patch-for-react-19`
- i18next localization with German and English resources under `src/locales/`
- Sass/SCSS module styling
- TipTap v2 rich-text editing
- Vitest 4 with two projects: `unit` (jsdom) and `storybook` (every story run in real Chromium via `@vitest/browser-playwright`); Storybook 10 with MSW, a11y, and designs addons; Cypress retained for integration runs
- OpenTelemetry Core-Web-Vitals RUM export to SigNoz (`src/observability/`)
- Docker/nginx container delivery with a Node-based auth BFF sidecar script
- GitHub Actions CI for npm build, Storybook builds, and Docker image validation

## Architecture Layers

### Bootstrap Routing

Key files:

- `src/index.tsx`
- `src/AdminApp.tsx`
- `src/App.tsx`
- `src/pages/lazyPages.ts`
- `src/router/ProtectedRoute.tsx`
- `src/components/Layout/ProtectedPageLayoutWrapper.tsx`

`src/index.tsx` initializes observability and mounts `AdminApp`. `src/AdminApp.tsx` wires React Query, app config context, Ant Design locale/theme, and React Router, and declares the public routes: login, password reset request/confirm, tenant-admin onboarding, counsellor onboarding, imprint, and privacy. `src/App.tsx` is the protected feature-route shell; feature pages are code-split through `src/pages/lazyPages.ts` and gated with `useUserPermissions`, `useUserRoles`, tenant data, app settings, and release toggles.

Current route areas include theme settings (with global-config, master-data, general, legal, app-settings, SMTP, and permissions tabs), agencies, topics, statistics (plus `/admin/statistic-preview`), logs (supervisor, inactive accounts, case handover), profile, users, tenants, global settings, and `/admin/links` (counsellor invites, tenant invites, external inbounds).

### Runtime Config Endpoints

Key files:

- `src/config/runtimeConfig.ts`
- `src/appConfig.ts`
- `public/env.js`
- `scripts/generate-runtime-env.js`
- `scripts/docker-entrypoint.sh`

Runtime config is not only a build-time concern. `runtimeConfig.ts` reads `window.__APP_CONFIG__` from `public/env.js` and falls back to `VITE_*` or `REACT_APP_*` values. It resolves API, app, Matrix, Keycloak, cookie, and CSRF settings, plus optional per-service origins (`USER_SERVICE_ORIGIN`, `AGENCY_SERVICE_ORIGIN`, `TENANT_SERVICE_ORIGIN`, `CONSULTING_TYPE_SERVICE_ORIGIN`, `KEYCLOAK_ORIGIN`) for mixed local/remote development.

`src/appConfig.ts` remains the central endpoint and route hub. It derives `mainURL`, `appURL`, and `matrixURL`; exports backend endpoints for tenant, tenant access, users, user admin, agency admin, topic, settings, statistics, logs, invite links, account invites, DPA invites, ID allocation, tutorial progress, and password reset; and declares admin route names under `/admin`.

### Auth Permissions

Key files:

- `src/hooks/useLoginMutation.hook.ts`
- `src/api/auth/getAccessToken.ts`
- `src/api/auth/auth.ts`
- `src/api/auth/authBffClient.ts`
- `src/api/auth/tokenSessionStore.ts`
- `src/router/ProtectedRoute.tsx`
- `src/hooks/useUserRoles.hook.ts`
- `src/hooks/useUserPermission.ts`
- `src/constants/userRolesToPermissions.ts`

Login flow:

1. `src/pages/Login/LoginForm.tsx` submits username, password, and optional OTP.
2. `useLoginMutation` calls `getAccessToken`.
3. `getAccessToken` posts to the Keycloak token endpoint built by `keycloakAuthPath`.
4. `useLoginMutation` verifies admin access through `tenantAccessEndpoint`.
5. Tokens are handed to the auth BFF (`/admin/auth/set-token`, `/admin/auth/session`, `/admin/auth/refresh-token`, `/admin/auth/clear-token` in `authBffClient.ts`); the BFF is served by `scripts/auth-bff-server.mjs` in the container and by `vite.authBffPlugin.ts` in dev.
6. `ProtectedRoute` checks session state and expiry before rendering protected routes.
7. `ProtectedPageLayoutWrapper` owns layout-level token refresh and navigation behavior.

Authorization flow:

1. `useUserRoles` reads JWT role and tenant claims.
2. `useUserRolesToPermission` maps roles and tenant settings to resource/action permissions.
3. `useUserPermissions().can(action, resource)` gates routes, nav entries, tabs, and page actions.

### API Clients

Key files:

- `src/api/fetchData.ts`
- `src/api/tenant/*`, `src/api/tenantOnboarding/*`
- `src/api/agency/*`
- `src/api/counselor/*`, `src/api/counsellorOnboarding/*`
- `src/api/admins/*`
- `src/api/user/*`, `src/api/passwordReset/*`
- `src/api/topic/*`, `src/api/consultingtype/*`
- `src/api/settings/*`
- `src/api/statistic/*`
- `src/api/invitelinks/*`, `src/api/accountInvites/*`
- `src/api/legal/*`, `src/api/idAllocation/*`, `src/api/tutorial/*`

`fetchData` attaches Bearer auth unless `skipAuth` is set, accepts caller-provided authorization, adds CSRF and language headers, handles abort/timeout behavior, and normalizes common response failures into `FETCH_ERRORS` codes.

Most domain API modules are thin endpoint-specific helpers. New helpers should continue to use endpoint constants from `src/appConfig.ts` and keep transport behavior in `fetchData`.

### Query Hooks Data

Hooks in `src/hooks/**` own React Query cache keys, enabled flags, mutation behavior, invalidation/refetch rules, and fallback behavior. Important examples include tenant data and tenant admin controls, public tenant data, user/admin table data, DPA gating and signatures (`useDpaGate`, `useDpaStatus`, `useDpaVersions`), DPIA master data, legal-text versions and translation, settings mutations, release toggles, two-factor setup, language selection, and login mutation.

### Admin Pages

Feature pages are under `src/pages/**`. The highest-blast-radius areas are:

- `src/pages/users/management/*` for consultants, agency admins, tenant admins, platform admins, and tenants (`UserManagementTable.tsx`, `TenantsManagementTable.tsx`).
- `src/pages/Tenants/*` and `src/pages/TenantSettings/*` (general, legal, app-settings, permissions, SMTP/unified-SMTP tabs) for tenant-level configuration; `src/pages/GlobalSettings/*` for platform-level settings.
- `src/pages/Agency/*` for agencies, agency legal settings, functionalities, and initial-meeting settings.
- `src/pages/Links/*` for the invite composer, CSV import, e-mail template dialog, counsellor/tenant account invites, and external inbound links.
- `src/pages/TenantOnboarding/*` and `src/pages/CounsellorOnboarding/*` for the public token-based onboarding wizards (including the DPA step and two-factor step).
- `src/pages/Statistic.tsx` plus `src/pages/Statistic/*` for the scoped statistics dashboard and tutorial statistics.
- `src/pages/Logs/*` for supervisor, inactive-account, and case-handover audit logs.

### Shared UI Forms

Shared UI modules live in `src/components/**`, `src/styles/**`, and `src/resources/**`. They include page shells, listing/data tables, segmented tabs, M3 controls (`M3Button`, `M3Switch`, `M3Checkbox`, ...), card system (`Card`, `CardDeck`, `CardGrid`, `CardEditable`), form field wrappers, the TipTap plugin editor, DPA/DPIA components (`DpaBlocker`, `DpaForwardDialog`, `DpaLegalForm`, `Dpia`), global search, layout/nav (`AdminSidebar`, `AdminMobileNav`), two-factor setup, and styling assets.

### Deployment CI

Key files:

- `Dockerfile`
- `nginx.conf`
- `scripts/docker-entrypoint.sh`
- `scripts/generate-runtime-env.js`
- `scripts/auth-bff-server.mjs`
- `.github/workflows/*.yml`
- `.github/actions/*/action.yml`
- `vite.config.ts`

The npm build emits `build/`, the Docker image copies it into `/usr/share/nginx/html/admin`, installs Node.js for the auth BFF sidecar, and the container entrypoint writes runtime `env.js` before starting nginx. GitHub Actions use reusable composite actions for npm install/build and Docker image creation, plus dedicated Storybook CI workflows.

## Data Flow

1. `src/index.tsx` starts observability and mounts `AdminApp`.
2. Public routes or protected `App` routes render a lazily loaded page module.
3. Page modules import hooks from `src/hooks/**`.
4. Hooks call domain API helpers from `src/api/**`.
5. API helpers use endpoint constants from `src/appConfig.ts`.
6. `fetchData` attaches auth, CSRF, and language headers and calls ORISO backend services.
7. Hooks return React Query state to pages.
8. Pages compose shared UI components and mutation handlers.

## Top Central Files

1. `src/appConfig.ts` — endpoint, route, feature flag, and runtime URL hub.
2. `src/config/runtimeConfig.ts` — runtime/build-time environment and per-service origin resolver.
3. `src/api/fetchData.ts` — shared authenticated API transport.
4. `src/AdminApp.tsx` — provider stack and public route shell.
5. `src/App.tsx` — protected route shell and feature map.
6. `src/hooks/useUserRoles.hook.ts` — JWT role and tenant-claim interpretation.
7. `src/hooks/useUserPermission.ts` — permission API used across routes and UI actions.
8. `src/api/auth/authBffClient.ts` — auth BFF token/session endpoints.
9. `src/pages/users/management/UserManagementTable.tsx` — central user-management table behavior.
10. `src/pages/Links/InviteComposer.tsx` — account-invite creation workflow.
