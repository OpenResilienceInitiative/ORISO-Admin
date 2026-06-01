# ORISO Admin Architecture Summary

## Purpose

`ORISO-Admin` is the operational admin dashboard for the Online-Beratung/ORISO platform. It manages tenants, tenant settings, agencies, counselors, agency admins, tenant admins, topics, invite links, profile settings, global SMTP/login settings, statistics, and audit/log views.

The application is a React/Vite single-page app served under `/admin`. It depends on Keycloak-compatible token endpoints and several ORISO backend services exposed under `/service/...`.

## Current Stack

- React 17 + TypeScript
- Vite build/dev server
- React Router v6 routing
- React Query for server-state fetching and mutations
- Ant Design and MUI component libraries
- i18next localization
- Sass/SCSS/Less styling
- Cypress integration tests
- Docker/nginx/Kubernetes ingress deployment

## Architecture Layers

### Bootstrap Shell Routing

Key files:

- `src/index.tsx`
- `src/App.tsx`
- `src/router/ProtectedRoute.tsx`
- `src/components/Layout/ProtectedPageLayoutWrapper.tsx`

`src/index.tsx` mounts the app and wires `QueryClientProvider`, `UseAppConfigProvider`, `AppSettingsWrapper`, Ant Design `ConfigProvider`, and `BrowserRouter`. Public routes are declared here (`/admin/login`, `/admin/404`, `/admin/access-denied`, imprint, privacy), and all other routes pass through `ProtectedRoute`.

`src/App.tsx` is the protected route shell. It chooses landing redirects and route availability using `useUserPermissions`, `useUserRoles`, tenant data, and app settings. This file is the highest-level map of admin features.

### Runtime Config Endpoints

Key files:

- `src/appConfig.ts`
- `src/context/useAppConfig.tsx`
- `src/api/settings/apiServerSettings.ts`
- `src/api/settings/sendGlobalSmtpTestEmail.ts`

`src/appConfig.ts` is the central boundary between frontend code and ORISO backend services. It derives `mainURL`, exports endpoint constants such as `tenantEndpoint`, `agencyEndpointBase`, `topicAdminEndpoint`, `tenantAdminsEndpoint`, `serverSettingsEndpoint`, and declares admin route names.

`src/context/useAppConfig.tsx` merges compile-time flags with server-provided settings from `/service/settings`.

### Auth Permissions

Key files:

- `src/hooks/useLoginMutation.hook.ts`
- `src/api/auth/getAccessToken.ts`
- `src/api/auth/auth.ts`
- `src/api/auth/logout.ts`
- `src/router/ProtectedRoute.tsx`
- `src/hooks/useUserRoles.hook.ts`
- `src/hooks/useUserPermission.ts`
- `src/constants/userRolesToPermissions.ts`

Login flow:

1. `src/pages/Login/LoginForm.tsx` submits credentials and OTP to `useLoginMutation`.
2. `useLoginMutation` calls `getAccessToken`.
3. `getAccessToken` posts to `loginEndpoint` (`/auth/realms/online-beratung/protocol/openid-connect/token`).
4. `useLoginMutation` verifies access through `tenantAccessEndpoint`.
5. `setTokens` stores `keycloak` and `refreshToken` cookies plus token expiry values in local storage.
6. `ProtectedRoute` checks cookies and expiry before allowing access.
7. `ProtectedPageLayoutWrapper` starts token refresh timers with `handleTokenRefresh`.

Authorization flow:

1. `useUserRoles` parses the JWT and extracts `realm_access.roles` and `tenantId`.
2. `useUserRolesToPermission` maps roles and tenant settings to resource permissions.
3. `useUserPermissions().can(action, resource)` gates routes, sidebar entries, tabs, and page actions.

### API Clients

Key files:

- `src/api/fetchData.ts`
- `src/api/tenant/*`
- `src/api/agency/*`
- `src/api/counselor/*`
- `src/api/admins/*`
- `src/api/topic/*`
- `src/api/user/*`
- `src/api/invitelinks/invitelinks.ts`

`src/api/fetchData.ts` is the shared transport wrapper. It attaches Bearer auth from the `keycloak` cookie unless `skipAuth` is set, adds CSRF headers, supports optional Rocket.Chat validation headers, handles abort/timeout, and normalizes response handling.

Most files under `src/api/**` are thin endpoint-specific functions. They should remain boring: construct URL from `appConfig.ts`, call `fetchData`, transform response shape only when necessary.

### Query Hooks Data

Key files:

- `src/hooks/useTenantData.hook.tsx`
- `src/hooks/usePublicTenantData.hook.tsx`
- `src/hooks/useSingleTenantData.ts`
- `src/hooks/useAgencysData.ts`
- `src/hooks/useConsultantsOrAdminsData.ts`
- `src/hooks/useTenantAdminDataMutation.hook.ts`
- `src/hooks/useSettingsAdminMutation.hook.ts`

Hooks own React Query cache keys, fetch orchestration, mutation invalidation/refetch behavior, and fallback behavior. `useTenantData.hook.tsx` is especially important because it combines public tenant lookup with authenticated tenant detail lookup and handles multi-tenancy-with-single-domain tenant selection.

### Admin Pages

Key areas:

- `src/pages/Tenants/*`
- `src/pages/TenantSettings/*`
- `src/pages/Agency/*`
- `src/pages/users/*`
- `src/pages/Topics/*`
- `src/pages/GlobalSettings/index.tsx`
- `src/pages/InviteLinks/index.tsx`
- `src/pages/Logs/*`

Page modules compose shared form/table components with hooks and permission checks. They should not grow into backend transport code; that belongs in `src/api/**` and `src/hooks/**`.

### Shared UI Forms

Key files/directories:

- `src/components/Page/index.tsx`
- `src/components/CardEditable/index.tsx`
- `src/components/EditableTable/*`
- `src/components/ResizableTable/*`
- `src/components/Form*`
- `src/components/Tenants/*`
- `src/components/FormPluginEditor/*`

This layer contains the reusable admin UI vocabulary. It is shared by tenant settings, agency editing, user management, topic management, and global settings.

### Deployment

Key files:

- `Dockerfile`
- `nginx.conf`
- `ingress.yaml`
- `deploy-admin.sh`
- `deploy-development.sh`
- `vite.config.ts`

The Docker image copies `build/` into `/usr/share/nginx/html/admin` and installs `nginx.conf`. `ingress.yaml` routes `admin.oriso.site` to a Kubernetes service named `admin` on port `9000`.

## Data Flow

1. Route/page loads from `src/App.tsx`.
2. Page imports one or more hooks from `src/hooks/**`.
3. Hook calls a typed API helper from `src/api/**`.
4. API helper uses endpoint constants from `src/appConfig.ts`.
5. API helper calls `fetchData`.
6. `fetchData` attaches auth/CSRF headers and calls ORISO backend services.
7. Hook returns React Query state to the page.
8. Page renders shared form/table components and mutation handlers.

## Top 10 Central Files

1. `src/appConfig.ts` — endpoint, route, feature flag, and runtime URL hub.
2. `src/api/fetchData.ts` — shared authenticated API transport.
3. `src/App.tsx` — protected admin route shell and feature map.
4. `src/hooks/useUserRoles.hook.ts` — JWT role and tenant-claim interpretation.
5. `src/context/useAppConfig.tsx` — app/server settings context.
6. `src/index.tsx` — app bootstrap and public/protected route split.
7. `src/pages/users/management/UserManagementTable.tsx` — central user-management table behavior.
8. `src/hooks/useTenantData.hook.tsx` — tenant data orchestration and fallback.
9. `src/constants/userRolesToPermissions.ts` — role-to-permission policy.
10. `src/components/Page/index.tsx` — common page layout/title/action surface.

