# ORISO Ecosystem Connection

`ORISO-Admin` is the administrative control plane for the wider ORISO/Online-Beratung system.

## Connected Systems

### ORISO Backend Services

`src/appConfig.ts` defines service endpoints, resolved per service origin (UserService, AgencyService, TenantService, ConsultingTypeService) with `mainURL` as fallback, including:

- `/service/tenant`, `/service/tenant/public`, `/service/tenant/access`, and `/service/tenantadmin` (TenantService)
- `/service/useradmin/tenantadmins`, `/service/useradmin/agencyadmins`, `/service/useradmin/consultants` (UserService)
- `/service/useradmin/invitelinks`, `/service/useradmin/account-invites`, `/service/useradmin/invite-email-templates`, `/service/useradmin/dpa-invites` (UserService)
- `/service/useradmin/statistics/dashboard` and `/service/useradmin/statistics/tutorials` (UserService)
- `/service/users` including password reset, password change, tutorial progress, account invites, and system-notification test e-mails (UserService)
- `/service/users/supervisors/logs`, `/service/users/case-handover/logs`, `/service/users/inactive-accounts/audit-logs` (UserService)
- `/service/agencyadmin/agencies`, `/service/agencyadmin/postcoderanges`, `/service/topicadmin` (AgencyService)
- `/service/consultingtypes`, `/service/topic`, `/service/settings`, `/service/settingsadmin` (ConsultingTypeService)

The admin app depends on these services for tenant configuration, user administration, agency management, invites and onboarding, DPA/legal workflows, settings, statistics, and audit views. `CLAUDE.md` carries the cross-repo routing table for where each `/service/...` concern lives.

### Keycloak / Auth Service

Auth endpoints are built through `keycloakAuthPath`:

- token exchange: `/realms/{realm}/protocol/openid-connect/token`
- logout: `/realms/{realm}/protocol/openid-connect/logout`

`runtimeConfig.ts` supports a dedicated `KEYCLOAK_URL` or legacy API-hosted auth fallback under `/auth/realms/{realm}`. Token storage and refresh go through the in-repo auth BFF (`src/api/auth/authBffClient.ts`, `scripts/auth-bff-server.mjs`) under `/admin/auth/*` rather than direct browser cookie handling.

### Public ORISO Frontend

This admin repo and the public ORISO frontend share concepts around tenants, subdomains, Keycloak tokens, tenant claims, backend service endpoints, feature flags, invite links, language settings, and legal text. The public app consumes the tenant experience that this admin app configures. Emailed invite links now land on admin-hosted public wizards (`/admin/tenant-onboarding`, `/admin/counsellor-onboarding`) instead of the app layer.

### Observability

`src/observability/` exports Core Web Vitals as OpenTelemetry metrics (OTLP/HTTP) to the platform's SigNoz stack, started in `src/index.tsx` before render.

### Runtime Deployment

Delivery is represented by:

- `Dockerfile` (onlineberatung-nginx base plus Node.js for the auth BFF)
- `nginx.conf`
- `scripts/docker-entrypoint.sh`
- `scripts/generate-runtime-env.js`
- `.github/workflows/*.yml`
- `.github/actions/*/action.yml`

The built app is served from `/usr/share/nginx/html/admin`. The container writes `env.js` from deployment environment variables (including optional per-service origins) before starting nginx.

## Ecosystem Role

`ORISO-Admin` does not provide the counseling UI itself. It configures tenants, agencies, users, permissions, legal documents (DPA, DPIA, imprint, privacy), invite and onboarding access paths, messaging/settings flags, statistics visibility, and global system behavior that other ORISO applications depend on.
