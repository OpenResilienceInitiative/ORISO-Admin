# ORISO Admin Developer Onboarding

## Start Here

Read these files in order:

1. `CLAUDE.md` and `AGENTS.md` — working rules, cross-repo map, validation commands.
2. `package.json` — npm commands, runtime dependencies, and framework versions (React 19, Vite 8, Router v7, Node 22).
3. `src/index.tsx` and `src/AdminApp.tsx` — observability init, providers, public routes, and protected app entry.
4. `src/App.tsx` and `src/pages/lazyPages.ts` — route map and permission-gated, code-split feature areas.
5. `src/config/runtimeConfig.ts` — runtime/build-time config and per-service origin resolver.
6. `src/appConfig.ts` — backend endpoints and admin route constants.
7. `src/api/fetchData.ts` — shared API request behavior.
8. `src/hooks/useLoginMutation.hook.ts` and `src/api/auth/*` — auth lifecycle including the auth BFF (`authBffClient.ts`).
9. `src/constants/userRolesToPermissions.ts` and `src/hooks/useUserPermission.ts` — authorization rules.

## Mental Model

`ORISO-Admin` is a role-gated admin SPA. Most screens are CRUD or configuration workflows around these domain areas:

- Tenants and tenant settings (general, legal, app settings, permissions, SMTP)
- Agencies, agency legal settings, functionalities, and initial-meeting settings
- Counsellors, agency admins, tenant admins, platform admins, and tenants
- Topics and topic admins
- Account invites (counsellor/tenant), invite e-mail templates, and external inbound links
- DPA/DPIA legal workflows and legal-text versions
- Public onboarding wizards: tenant-admin onboarding, counsellor onboarding, password reset
- Global login, SMTP, and server settings
- Statistics and audit/log views (supervisor, inactive accounts, case handover)

The app is not a backend. Backend service URLs are centralized in `src/appConfig.ts`, with runtime host values (and optional per-service origins) resolved in `src/config/runtimeConfig.ts`.

## How A Screen Usually Works

1. A route is declared in `src/App.tsx` (protected) or `src/AdminApp.tsx` (public), lazily loaded via `src/pages/lazyPages.ts`.
2. The page module lives in `src/pages/<Area>/...`.
3. The page imports a hook from `src/hooks/**`.
4. The hook calls API functions from `src/api/**`.
5. API functions call `fetchData`.
6. `fetchData` attaches `Authorization`, `X-CSRF-TOKEN`, language headers, and optional local-development headers.
7. Shared components from `src/components/**` render forms, tables, modals, cards, editors, and page shells. Prefer MUI/M3 components (`M3Button`, `Card*`, `DataTable`); AntD remains for legacy screens and is themed through `src/theme/antdM3Theme.ts`.

## Auth And Permissions

New developers should distinguish:

- token/session presence and expiry checks in `ProtectedRoute`
- token storage and refresh through the auth BFF endpoints in `src/api/auth/authBffClient.ts` (served by `scripts/auth-bff-server.mjs` in the container, `vite.authBffPlugin.ts` in dev)
- token refresh and navigation behavior in `ProtectedPageLayoutWrapper`
- JWT role extraction in `useUserRoles`
- resource/action authorization in `useUserPermissions`
- app settings, tenant feature flags, and release toggles in `useAppConfigContext`, `useTenantData`, and `useReleasesToggle`
- DPA gating: `useDpaGate` and `DpaBlocker` can block admin areas until the data-processing agreement is signed

## API Structure

The API directory is organized by backend domain:

- `src/api/tenant/*` and `src/api/tenantOnboarding/*`
- `src/api/agency/*`
- `src/api/counselor/*` and `src/api/counsellorOnboarding/*`
- `src/api/admins/*`
- `src/api/topic/*` and `src/api/consultingtype/*`
- `src/api/user/*` and `src/api/passwordReset/*`
- `src/api/settings/*`
- `src/api/statistic/*`
- `src/api/invitelinks/*` and `src/api/accountInvites/*`
- `src/api/legal/*`, `src/api/idAllocation/*`, `src/api/tutorial/*`

When adding a new endpoint, add or reuse an endpoint constant, add a small API helper, wrap it in a hook when it needs React Query behavior, and call that hook from a page/component.

## High-Change Feature Areas

### Users

Start with:

- `src/pages/users/List/index.tsx`
- `src/pages/users/management/UserManagementTable.tsx`
- `src/pages/users/management/userTableConfigs.ts`
- `src/pages/users/management/useUserTableColumns.tsx`
- `src/hooks/usePlatformAdminsData.ts`
- `src/hooks/useTenantUserAdminsData.ts`
- `src/hooks/useConsultantsOrAdminsData.ts`

The table serves consultants, agency admins, tenant admins, platform admins, and tenant/organization rows. Treat changes here as high-blast-radius.

### Links And Invites

Start with:

- `src/pages/Links/index.tsx`
- `src/pages/Links/AccountInvitesTab.tsx` (counsellor and tenant invites)
- `src/pages/Links/InviteComposer.tsx` and `src/pages/Links/InviteCsvImportModal.tsx`
- `src/pages/Links/ExternalInboundsTab.tsx`
- `src/api/accountInvites/accountInvites.ts` and `src/api/invitelinks/*`

All three tabs (counsellor invites, tenant invites, external inbounds) are enabled.

### Statistics

Start with:

- `src/pages/Statistic.tsx`
- `src/pages/Statistic/types.ts`
- `src/pages/Statistic/statisticDashboardData.ts`
- `src/pages/Statistic/useStatisticDashboardData.hook.ts`
- `src/pages/Statistic/TutorialStatisticsSection.tsx`

Statistics are UI-heavy and scope-aware across platform, tenant, and agency views.

### Deployment

Start with:

- `Dockerfile`
- `scripts/docker-entrypoint.sh`
- `scripts/generate-runtime-env.js`
- `scripts/auth-bff-server.mjs`
- `.github/workflows/ci-pull-request.yml`
- `.github/actions/node-build/action.yml`

Runtime config is injected into `env.js` at container startup, so do not assume API/Keycloak values are fixed at npm build time. The container also runs a Node auth BFF sidecar for token handling.

## Local Development Checklist

```bash
npm install
npm run start        # Vite dev server on VITE_PORT (default 9000), served under /admin
npm run test         # Vitest unit project (jsdom)
npm run test:storybook  # every story in real Chromium (needs Playwright browsers)
npm run build
npm run lint         # stylelint + eslint + prettier check
```

Use `.env.example` as the starting point for runtime values. The app expects ORISO backend services and Keycloak-compatible auth endpoints to be reachable; per-service `VITE_*_ORIGIN` variables let you point single services at a local instance.
