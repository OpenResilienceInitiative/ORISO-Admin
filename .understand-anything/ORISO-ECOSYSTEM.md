# ORISO Ecosystem Connection

`ORISO-Admin` is the administrative control plane for the wider ORISO/Online-Beratung system.

## Connected Systems

### ORISO Backend Services

`src/appConfig.ts` defines service endpoints under `mainURL`, including:

- `/service/tenant`, `/service/tenant/public`, and `/service/tenant/access`
- `/service/tenantadmin`
- `/service/useradmin/tenantadmins`
- `/service/useradmin/agencyadmins`
- `/service/useradmin/consultants`
- `/service/users`
- `/service/topic` and `/service/topicadmin`
- `/service/settings` and `/service/settingsadmin`
- `/service/statistics/registration`
- `/service/users/supervisors/logs`
- `/service/users/inactive-accounts/audit-logs`

The admin app depends on these services for tenant configuration, user administration, agency management, settings, statistics, invite links, and audit views.

### Keycloak / Auth Service

Auth endpoints are built through `keycloakAuthPath`:

- token exchange: `/realms/{realm}/protocol/openid-connect/token`
- logout: `/realms/{realm}/protocol/openid-connect/logout`

`runtimeConfig.ts` supports a dedicated `KEYCLOAK_URL` or legacy API-hosted auth fallback under `/auth/realms/{realm}`.

### Public ORISO Frontend

This admin repo and the public ORISO frontend share concepts around tenants, subdomains, Keycloak tokens, tenant claims, backend service endpoints, feature flags, invite links, language settings, and legal text. The public app consumes the tenant experience that this admin app configures.

### Appointment / Cal.com Integration

`src/appConfig.ts` exposes appointment-service endpoints for agency event types and consultants. `runtimeConfig.appointmentServiceUrl` defaults to the configured appointment service URL and is used by route constants for development workflows.

### Runtime Deployment

Delivery is represented by:

- `Dockerfile`
- `nginx.conf`
- `scripts/docker-entrypoint.sh`
- `scripts/generate-runtime-env.js`
- `.github/workflows/*.yml`
- `.github/actions/*/action.yml`

The built app is served from `/usr/share/nginx/html/admin`. The container writes `env.js` from deployment environment variables before starting nginx.

## Ecosystem Role

`ORISO-Admin` does not provide the counseling UI itself. It configures tenants, agencies, users, permissions, messaging/legal/settings flags, invite-link access paths, statistics visibility, and global system behavior that other ORISO applications depend on.
