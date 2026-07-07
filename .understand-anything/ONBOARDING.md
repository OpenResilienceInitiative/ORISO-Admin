# ORISO Admin Developer Onboarding

## Start Here

Read these files in order:

1. `README.md` — setup, runtime config, deployment, and dashboard notes.
2. `package.json` — npm commands, runtime dependencies, and framework versions.
3. `src/index.tsx` — providers, public routes, and protected app entry.
4. `src/App.tsx` — route map and permission-gated feature areas.
5. `src/config/runtimeConfig.ts` — runtime/build-time config resolver.
6. `src/appConfig.ts` — backend endpoints and admin route constants.
7. `src/api/fetchData.ts` — shared API request behavior.
8. `src/hooks/useLoginMutation.hook.ts` and `src/api/auth/*` — auth lifecycle.
9. `src/constants/userRolesToPermissions.ts` and `src/hooks/useUserPermission.ts` — authorization rules.

## Mental Model

`ORISO-Admin` is a role-gated admin SPA. Most screens are CRUD or configuration workflows around these domain areas:

-   Tenants and tenant settings
-   Agencies and initial-meeting/event-type settings
-   Counselors, agency admins, tenant admins, platform admins, and tenant users
-   Topics and topic admins
-   Invite links and external inbound links
-   Global login, SMTP, runtime/server settings
-   Statistics and audit/log views

The app is not a backend. Backend service URLs are centralized in `src/appConfig.ts`, with runtime host values resolved in `src/config/runtimeConfig.ts`.

## How A Screen Usually Works

1. A route is declared in `src/App.tsx`.
2. The page module lives in `src/pages/<Area>/...`.
3. The page imports a hook from `src/hooks/**`.
4. The hook calls API functions from `src/api/**`.
5. API functions call `fetchData`.
6. `fetchData` attaches `Authorization`, `X-CSRF-TOKEN`, language headers, and optional local-development headers.
7. Shared components from `src/components/**` render forms, tables, modals, cards, editors, and page shells.

## Auth And Permissions

New developers should distinguish:

-   token presence and expiry checks in `ProtectedRoute`
-   token refresh and navigation behavior in `ProtectedPageLayoutWrapper`
-   JWT role extraction in `useUserRoles`
-   resource/action authorization in `useUserPermissions`
-   app settings and tenant feature flags in `useAppConfigContext`, `useTenantData`, and release-toggle hooks

## API Structure

The API directory is organized by backend domain:

-   `src/api/tenant/*`
-   `src/api/agency/*`
-   `src/api/counselor/*`
-   `src/api/admins/*`
-   `src/api/topic/*`
-   `src/api/user/*`
-   `src/api/settings/*`
-   `src/api/statistic/*`
-   `src/api/invitelinks/*`

When adding a new endpoint, add or reuse an endpoint constant, add a small API helper, wrap it in a hook when it needs React Query behavior, and call that hook from a page/component.

## High-Change Feature Areas

### Users

Start with:

-   `src/pages/users/List/index.tsx`
-   `src/pages/users/management/UserManagementTable.tsx`
-   `src/pages/users/management/userTableConfigs.ts`
-   `src/pages/users/management/useUserTableColumns.tsx`
-   `src/hooks/usePlatformAdminsData.ts`
-   `src/hooks/useTenantUserAdminsData.ts`
-   `src/hooks/useConsultantsOrAdminsData.ts`

The table now serves consultants, agency admins, tenant admins, platform admins, and tenant/organization rows. Treat changes here as high-blast-radius.

### Links

Start with:

-   `src/pages/Links/index.tsx`
-   `src/pages/Links/ExternalInboundsTab.tsx`
-   `src/api/invitelinks/topicInviteLinks.ts`
-   `src/api/invitelinks/inviteLinkApiShared.ts`

Current enabled tab is external inbound links. Tenant and counselor tabs are present but disabled in the UI.

### Statistics

Start with:

-   `src/pages/Statistic.tsx`
-   `src/pages/Statistic/types.ts`
-   `src/pages/Statistic/statisticConstants.ts`
-   `src/pages/Statistic/statisticChartUtils.ts`
-   `src/pages/Statistic/statisticPreferences.ts`

Statistics are UI-heavy and scope-aware across platform, tenant, and agency views.

### Deployment

Start with:

-   `Dockerfile`
-   `scripts/docker-entrypoint.sh`
-   `scripts/generate-runtime-env.js`
-   `.github/workflows/ci-pull-request.yml`
-   `.github/actions/node-build/action.yml`

Runtime config is injected into `env.js` at container startup, so do not assume API/Keycloak values are fixed at npm build time.

## Local Development Checklist

```bash
npm install
npm run start
npm run build
npm run lint
```

Use `.env.example` as the starting point for runtime values. The app expects ORISO backend services and Keycloak-compatible auth endpoints to be reachable.
