# ORISO Admin Developer Onboarding

## Start Here

Read these files in order:

1. `README.md` — current project setup and deployment notes.
2. `package.json` — commands, runtime dependencies, and framework versions.
3. `src/index.tsx` — providers, public routes, and protected app entry.
4. `src/App.tsx` — route map and permission-gated feature areas.
5. `src/appConfig.ts` — backend endpoints and admin route constants.
6. `src/api/fetchData.ts` — shared API request behavior.
7. `src/hooks/useLoginMutation.hook.ts` and `src/api/auth/*` — auth lifecycle.
8. `src/constants/userRolesToPermissions.ts` — authorization rules.

## Mental Model

`ORISO-Admin` is a role-gated admin SPA. Most screens are CRUD or configuration workflows around these domain areas:

- Tenants and tenant settings
- Agencies and initial meeting/event-type settings
- Counselors, agency admins, tenant admins, and tenant users
- Topics and topic admins
- Invite links
- Global login/SMTP settings
- Statistics and audit/log views

The app is not a backend. Backend service URLs are centralized in `src/appConfig.ts`; UI code should not hardcode service paths.

## How A Screen Usually Works

1. A route is declared in `src/App.tsx`.
2. The page module lives in `src/pages/<Area>/...`.
3. The page imports a hook from `src/hooks/**`.
4. The hook calls API functions from `src/api/**`.
5. API functions call `fetchData`.
6. `fetchData` attaches `Authorization`, `X-CSRF-TOKEN`, and optional local-development headers.
7. Shared components from `src/components/**` render forms, tables, modals, cards, and page shells.

## Auth And Permissions

Important files:

- `src/pages/Login/LoginForm.tsx`
- `src/hooks/useLoginMutation.hook.ts`
- `src/api/auth/getAccessToken.ts`
- `src/api/auth/auth.ts`
- `src/router/ProtectedRoute.tsx`
- `src/components/Layout/ProtectedPageLayoutWrapper.tsx`
- `src/hooks/useUserRoles.hook.ts`
- `src/hooks/useUserPermission.ts`
- `src/constants/userRolesToPermissions.ts`

New developers should pay close attention to the difference between:

- token presence and expiry (`ProtectedRoute`)
- token refresh (`handleTokenRefresh`)
- JWT role extraction (`useUserRoles`)
- resource/action authorization (`useUserPermissions`)
- app settings and tenant feature flags (`useAppConfigContext`, `useTenantData`)

## API Structure

The API directory is organized by backend domain:

- `src/api/tenant/*`
- `src/api/agency/*`
- `src/api/counselor/*`
- `src/api/admins/*`
- `src/api/topic/*`
- `src/api/user/*`
- `src/api/settings/*`
- `src/api/statistic/*`
- `src/api/invitelinks/*`

When adding a new endpoint:

1. Add or reuse an endpoint constant in `src/appConfig.ts`.
2. Add a small API helper in the relevant `src/api/<domain>/` folder.
3. Wrap it in a hook under `src/hooks/` if it needs React Query caching or mutation behavior.
4. Use that hook from a page or component.

## Feature Areas

### Tenants

Start with:

- `src/pages/Tenants/Edit/index.tsx`
- `src/pages/Tenants/Edit/General/index.tsx`
- `src/pages/TenantSettings/index.tsx`
- `src/components/Tenants/*`
- `src/hooks/useTenantData.hook.tsx`
- `src/hooks/useSingleTenantData.ts`

Tenant flows are sensitive to feature flags, server settings, and `multitenancyWithSingleDomainEnabled`.

### Agencies

Start with:

- `src/pages/Agency/List/index.tsx`
- `src/pages/Agency/Edit/index.tsx`
- `src/pages/Agency/EditInitialMeeting/index.tsx`
- `src/hooks/useAgencysData.ts`
- `src/hooks/useAgencyUpdate.ts`
- `src/api/agency/*`

Agency flows combine agency metadata, postcode ranges, topics, consulting types, and appointment-service event types.

### Users

Start with:

- `src/pages/users/List/index.tsx`
- `src/pages/users/management/UserManagementTable.tsx`
- `src/pages/users/management/useUserTableColumns.tsx`
- `src/pages/users/Edit/index.tsx`
- `src/pages/users/TenantAdminEdit/index.tsx`
- `src/hooks/useConsultantsOrAdminsData.ts`
- `src/hooks/useTenantUserAdminsData.ts`

The user table is a central operational surface. Treat changes there as high-blast-radius.

### Global Settings

Start with:

- `src/pages/GlobalSettings/index.tsx`
- `src/hooks/useSettingsAdminMutation.hook.ts`
- `src/api/settings/sendGlobalSmtpTestEmail.ts`

These screens are mostly super-admin-only and affect platform-wide behavior.

## Complexity Hotspots

- `src/appConfig.ts` has very high coupling because most API and route modules import it.
- `src/App.tsx` owns route and permission composition for nearly every admin surface.
- `src/api/fetchData.ts` centralizes auth, CSRF, error behavior, timeout handling, and logout behavior.
- `src/pages/users/management/UserManagementTable.tsx` concentrates table state, actions, and user-type-specific behavior.
- `src/pages/Agency/Edit/index.tsx` and nested agency edit components touch several domains at once.
- `src/components/FormPluginEditor/*` mixes Draft.js plugins, custom link/image/placeholder controls, and legal-text editing.

## Local Development Checklist

```bash
npm install
npm run start
npm run build
npm run lint
npm run test:integration:cli
```

Use `.env.example` as the starting point for runtime values. The app expects ORISO backend services and Keycloak-compatible auth endpoints to be reachable.

