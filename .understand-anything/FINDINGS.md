# Findings And Maintainability Risks

## Current Graph Findings

- Graph was refreshed from latest `dev` commit `1a367cd463191425e4ee61f02ec5f1a35d6b02bf`.
- Files analyzed: `527`
- Largest graph layers by file-level node count:
  - Shared UI Styles: `159`
  - Admin Pages: `149`
  - Runtime Config: `71`
  - API Clients: `66`
  - Hooks Context: `51`
  - Domain Types Enums: `41`

## Missing Or Thin Documentation

- Root `README.md` has improved graph-dashboard instructions but still mixes local examples, production-like URLs, and deployment snippets in one page.
- Auth and permission behavior is spread across auth APIs, `ProtectedRoute`, layout refresh logic, user-role hooks, and permission constants without a dedicated ADR.
- Endpoint ownership is implicit in `src/appConfig.ts`; there is still no backend-service ownership map for each endpoint group.
- Runtime config now spans `public/env.js`, `runtimeConfig.ts`, `.env.example`, Docker entrypoint logic, and GitHub Actions, but this deserves a short deployment/runtime ADR.

## Risky Or High-Coupling Areas

- `src/appConfig.ts` remains highly central because most API and route modules depend on it.
- `src/config/runtimeConfig.ts` is now a critical production boundary for runtime-injected host, cookie, Keycloak, CSRF, and appointment-service behavior.
- `src/App.tsx` mixes route definition, permission decisions, tenant settings, role checks, release toggles, and redirect decisions.
- `src/api/fetchData.ts` centralizes auth, CSRF, language headers, timeout handling, response handling, and logout behavior.
- `src/pages/users/management/UserManagementTable.tsx` now covers consultants, agency admins, tenant admins, platform admins, and tenants.
- `src/pages/Statistic.tsx` plus its helper modules form a large UI composition surface with many display states.
- `src/pages/Links/ExternalInboundsTab.tsx` connects topic lookup, link creation, pagination, clipboard behavior, and invite-link URL generation.

## Dead Or Stale Code Candidates

- Fake API modules remain candidates for quarantine or removal if they are not active fixtures:
  - `src/api/user/getFAKEUserData.ts`
  - `src/api/counselor/addFAKECounselorData.ts`
  - `src/api/counselor/deleteFAKECounselorData.ts`
  - `src/api/counselor/editFAKECounselorData.ts`
  - `src/api/tenant/editFAKETenantData.ts`
  - `src/api/tenant/getFAKETenantData.ts`
  - `src/api/tenant/getFakeMultipleTenants.ts`
- Debug comments remain around auth and route-guard code. They add noise in security-sensitive paths.

## Suggested Follow-Up Work

1. Add an auth/permissions ADR covering roles, tenant claims, token refresh, route gating, and superadmin behavior.
2. Add a runtime-config ADR covering `env.js`, Docker entrypoint generation, `VITE_*`/`REACT_APP_*` precedence, and Keycloak fallback.
3. Split `src/appConfig.ts` into runtime constants, backend endpoints, and route names when the next endpoint-heavy change lands.
4. Add focused tests around `runtimeConfig`, `fetchData`, `useUserRoles`, `useUserPermissions`, and `ProtectedRoute`.
5. Keep the user-management table and statistics dashboard behind focused regression tests before large UI refactors.
