# Findings And Maintainability Risks

## Missing Documentation

- Root `README.md` is short and still contains machine-specific paths such as `/home/caritas/Desktop/...` and concrete IP examples. It does not yet match the richer documentation structure used in `ORISO-Frontend`.
- There is no repo-level `docs/` hub for architecture, rules, implementation skills, or planning.
- Auth and permission behavior is spread across `src/api/auth/*`, `src/router/ProtectedRoute.tsx`, `src/components/Layout/ProtectedPageLayoutWrapper.tsx`, `src/hooks/useUserRoles.hook.ts`, and `src/constants/userRolesToPermissions.ts` without a dedicated auth architecture note.
- API endpoint ownership is implicit in `src/appConfig.ts`; there is no endpoint/domain map documenting which backend service owns each API group.

## Dead Or Stale Code Candidates

- `Untitled` contains only `rhiran`; it looks accidental and should be removed if not intentionally tracked.
- Fake API modules appear unused by non-API code:
  - `src/api/user/getFAKEUserData.ts`
  - `src/api/counselor/addFAKECounselorData.ts`
  - `src/api/counselor/deleteFAKECounselorData.ts`
  - `src/api/counselor/editFAKECounselorData.ts`
  - `src/api/tenant/editFAKETenantData.ts`
  - `src/api/tenant/getFAKETenantData.ts`
  - `src/api/tenant/getFakeMultipleTenants.ts`
- `src/api/topic/getTopicData.ts` still has a commented `removeEmbedded` import.
- Several debug `console.log` blocks remain commented across auth, tenant, app, and permission files. They add noise around the most security-sensitive code.

## Risky Dependencies

See [Dependency Audit](./DEPENDENCY-AUDIT.md). The production audit found `26` advisories: `7` moderate, `18` high, and `1` critical.

Highest-impact items:

- `axios@0.25.0` has multiple high-severity advisories and would require a breaking upgrade.
- `@babel/traverse` has a critical advisory through the current dependency tree.
- Draft.js / React-RTE / immutable dependencies carry high-severity prototype-pollution exposure.
- `lodash.set` is directly used in `src/components/Tenants/LegalSettings/components/LegalText/index.tsx` and has no fix available according to npm audit.

## Unclear Architecture Boundaries

- `src/appConfig.ts` mixes runtime URL derivation, endpoint constants, feature flags, route names, external legal URLs, and appointment-service dev URLs. It is the most central module in the graph.
- `src/App.tsx` mixes route definition, permission decisions, tenant settings, role checks, and redirect decisions.
- `src/components/Layout/ProtectedPageLayoutWrapper.tsx` mixes layout, navigation policy, token refresh, developer mode toggles, overlay cleanup, and subdomain mismatch handling.
- Pages often import hooks, API helpers, enums, feature contexts, permission logic, and shared components directly. That is pragmatic, but it makes feature boundaries hard to extract.

## Duplicated Or Repeated Logic

- CRUD API helpers follow repeated patterns across `src/api/tenant`, `src/api/agency`, `src/api/counselor`, `src/api/admins`, and `src/api/topic`.
- React Query hooks repeat fetch/mutate/invalidate patterns across tenant, agency, topic, and user modules.
- User/admin table handling is concentrated in `src/pages/users/management/UserManagementTable.tsx` and nearby config files; changes here may affect consultants, agency admins, tenant admins, and tenant user views simultaneously.
- Auth-related debug comments repeat across `src/api/auth/*`, `src/router/ProtectedRoute.tsx`, `src/hooks/useLoginMutation.hook.ts`, and `src/components/Layout/ProtectedPageLayoutWrapper.tsx`.

## Suggested Follow-Up Work

1. Add a root `docs/README.md` similar to `ORISO-Frontend`.
2. Split `src/appConfig.ts` into `runtimeConfig`, `apiEndpoints`, and `routePathNames`.
3. Create an auth/permissions ADR documenting roles, tenant claims, token refresh, and route gating.
4. Remove or quarantine fake API modules behind a test fixture namespace.
5. Replace `lodash.set` usage in legal text settings with a small typed immutable update helper.
6. Plan the Axios upgrade separately because npm audit marks it as breaking.
7. Add focused tests around `useUserRoles`, `useUserRolesToPermission`, `ProtectedRoute`, and `fetchData`.

