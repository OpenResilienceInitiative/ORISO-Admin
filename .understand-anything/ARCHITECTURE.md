# ORISO Admin Architecture Summary

## Purpose

`ORISO-Admin` is the operational admin dashboard for the ORISO Online-Beratung platform. It manages tenants, tenant settings, agencies, counselors, agency admins, tenant admins, platform admins, topics, invite links, external inbound links, profile settings, runtime/server settings, statistics, and audit/log views.

The application is a React/Vite single-page app served under `/admin`. It depends on Keycloak-compatible auth endpoints and ORISO backend services exposed under `/service/...`.

## Current Stack

- React 17 + TypeScript
- Vite 4 build/dev server
- React Router v6 routing
- React Query for server-state fetching and mutations
- Ant Design and MUI component libraries
- i18next localization with German and English resources
- Sass/SCSS/Less styling
- TipTap and legacy rich-text editor dependencies
- Cypress integration-test tooling
- Docker/nginx container delivery
- GitHub Actions CI for npm build and Docker image validation

## Architecture Layers

### Bootstrap Routing

Key files:

- `src/index.tsx`
- `src/App.tsx`
- `src/router/ProtectedRoute.tsx`
- `src/components/Layout/ProtectedPageLayoutWrapper.tsx`

`src/index.tsx` mounts the app and wires React Query, app config, app settings, Ant Design, and React Router providers. `src/App.tsx` is the protected feature-route shell. It chooses landing redirects and route availability using `useUserPermissions`, `useUserRoles`, tenant data, app settings, and release toggles.

Current route areas include tenants, tenant settings, global login/SMTP redirects, agency editing, topics, statistics, logs, profile, users, invite links, and the `/admin/links/external-inbounds` workflow.

### Runtime Config Endpoints

Key files:

- `src/config/runtimeConfig.ts`
- `src/appConfig.ts`
- `public/env.js`
- `scripts/generate-runtime-env.js`
- `scripts/docker-entrypoint.sh`

Runtime config is no longer only a build-time concern. `runtimeConfig.ts` reads `window.__APP_CONFIG__` from `public/env.js` and falls back to `VITE_*` or `REACT_APP_*` values. It resolves API, Keycloak, app, Matrix, cookie, CSRF, and appointment-service settings.

`src/appConfig.ts` remains the central endpoint and route hub. It derives `mainURL`, `appURL`, and `matrixURL`; exports backend endpoints for tenant, tenant access, users, user admin, agency admin, topic, settings, statistics, logs, invite links, and appointment-service APIs; and declares admin route names under `/admin`.

### Auth Permissions

Key files:

- `src/hooks/useLoginMutation.hook.ts`
- `src/api/auth/getAccessToken.ts`
- `src/api/auth/auth.ts`
- `src/api/auth/accessSessionCookie.ts`
- `src/router/ProtectedRoute.tsx`
- `src/hooks/useUserRoles.hook.ts`
- `src/hooks/useUserPermission.ts`
- `src/constants/userRolesToPermissions.ts`

Login flow:

1. `src/pages/Login/LoginForm.tsx` submits username, password, and optional OTP.
2. `useLoginMutation` calls `getAccessToken`.
3. `getAccessToken` posts to the Keycloak token endpoint built by `keycloakAuthPath`.
4. `useLoginMutation` verifies admin access through `tenantAccessEndpoint`.
5. `setTokens` stores access and refresh token cookies plus expiry metadata.
6. `ProtectedRoute` checks cookies and expiry before rendering protected routes.
7. `ProtectedPageLayoutWrapper` owns layout-level token refresh and navigation behavior.

Authorization flow:

1. `useUserRoles` reads JWT role and tenant claims.
2. `useUserRolesToPermission` maps roles and tenant settings to resource/action permissions.
3. `useUserPermissions().can(action, resource)` gates routes, nav entries, tabs, and page actions.

### API Clients

Key files:

- `src/api/fetchData.ts`
- `src/api/tenant/*`
- `src/api/agency/*`
- `src/api/counselor/*`
- `src/api/admins/*`
- `src/api/user/*`
- `src/api/topic/*`
- `src/api/settings/*`
- `src/api/statistic/*`
- `src/api/invitelinks/*`

`fetchData` attaches Bearer auth from the `keycloak` cookie unless `skipAuth` is set, accepts caller-provided authorization, adds CSRF and language headers, supports optional Rocket.Chat headers, handles abort/timeout behavior, and normalizes common response failures.

Most domain API modules are thin endpoint-specific helpers. New helpers should continue to use endpoint constants from `src/appConfig.ts` and keep transport behavior in `fetchData`.

### Query Hooks Data

Hooks in `src/hooks/**` own React Query cache keys, enabled flags, mutation behavior, invalidation/refetch rules, and fallback behavior. Important examples include tenant data, tenant admin controls, public tenant data, user/admin table data, platform admin data, settings mutations, language selection, and login mutation.

### Admin Pages

Feature pages are under `src/pages/**`. The highest-blast-radius areas are:

- `src/pages/users/management/*` for consultants, agency admins, tenant admins, platform admins, and tenants.
- `src/pages/Tenants/*` and `src/pages/TenantSettings/*` for tenant-level and global configuration.
- `src/pages/Agency/*` for agencies, agency legal text, registration, responsible contacts, and initial meeting/event-type settings.
- `src/pages/Links/*` and `src/api/invitelinks/*` for external inbound topic invite links.
- `src/pages/Statistic.tsx` plus `src/pages/Statistic/*` for the scoped statistics dashboard.
- `src/pages/Logs/*` for supervisor and inactive-account audit logs.

### Shared UI Forms

Shared UI modules live in `src/components/**`, `src/styles/**`, and `src/resources/**`. They include page shells, listing tables, resizable tables, segmented tabs, search input, forms, tenant setting components, legal-text editors, language selector, layout/nav icons, and styling assets.

### Deployment CI

Key files:

- `Dockerfile`
- `nginx.conf`
- `scripts/docker-entrypoint.sh`
- `scripts/generate-runtime-env.js`
- `.github/workflows/*.yml`
- `.github/actions/*/action.yml`
- `vite.config.ts`

The npm build emits `build/`, the Docker image copies it into `/usr/share/nginx/html/admin`, and the container entrypoint writes runtime `env.js` before starting nginx. GitHub Actions use reusable composite actions for npm install/build and Docker image creation.

## Data Flow

1. `src/index.tsx` mounts providers and routes.
2. Public login or protected `App` routes render a page module.
3. Page modules import hooks from `src/hooks/**`.
4. Hooks call domain API helpers from `src/api/**`.
5. API helpers use endpoint constants from `src/appConfig.ts`.
6. `fetchData` attaches auth, CSRF, and language headers and calls ORISO backend services.
7. Hooks return React Query state to pages.
8. Pages compose shared UI components and mutation handlers.

## Top Central Files

1. `src/appConfig.ts` — endpoint, route, feature flag, and runtime URL hub.
2. `src/config/runtimeConfig.ts` — runtime/build-time environment resolver.
3. `src/api/fetchData.ts` — shared authenticated API transport.
4. `src/App.tsx` — protected route shell and feature map.
5. `src/hooks/useUserRoles.hook.ts` — JWT role and tenant-claim interpretation.
6. `src/hooks/useUserPermission.ts` — permission API used across routes and UI actions.
7. `src/context/useAppConfig.tsx` — app/server settings context.
8. `src/pages/users/management/UserManagementTable.tsx` — central user-management table behavior.
9. `src/pages/Statistic.tsx` — statistics dashboard composition.
10. `src/pages/Links/ExternalInboundsTab.tsx` — external inbound link workflow.
