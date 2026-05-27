# ORISO Ecosystem Connection

`ORISO-Admin` is the administrative frontend for the wider ORISO/Online-Beratung system.

## Connected Systems

### ORISO Backend Services

`src/appConfig.ts` defines service endpoints under `mainURL`, including:

- `/service/tenant`
- `/service/tenant/public`
- `/service/tenant/access`
- `/service/tenantadmin`
- `/service/agencyadmin`
- `/service/useradmin`
- `/service/users`
- `/service/topic`
- `/service/topicadmin`
- `/service/settings`
- `/service/settingsadmin`
- `/service/statistics/registration`

The admin app depends on these services for tenant configuration, user administration, agency management, settings, statistics, invite links, and audit views.

### Keycloak / Auth Service

Auth endpoints are built in `src/appConfig.ts`:

- `/auth/realms/online-beratung/protocol/openid-connect/token`
- `/auth/realms/online-beratung/protocol/openid-connect/logout`

`src/api/auth/getAccessToken.ts`, `src/api/auth/auth.ts`, and `src/router/ProtectedRoute.tsx` own the frontend token lifecycle.

### ORISO Frontend

This admin repo and `ORISO-Frontend` share domain concepts and some architectural ideas:

- tenant identity and subdomain handling
- Keycloak tokens and tenant claims
- ORISO backend service endpoints
- feature flags and server-driven settings
- invite link and anonymous/tenant access concepts
- shared naming around tenants, agencies, consultants, users, topics, and legal text

The public/client-facing app consumes the configured tenant experience. This admin app manages much of that configuration.

### Appointment / Cal.com Integration

`src/appConfig.ts` contains appointment-service endpoints and `appointmentServiceDevServer`. Agency initial-meeting and event-type screens use appointment-service-related API paths.

### Kubernetes / Delivery

Delivery is represented by:

- `Dockerfile`
- `nginx.conf`
- `ingress.yaml`
- `deploy-admin.sh`
- `deploy-development.sh`

The built app is served from `/usr/share/nginx/html/admin`. Kubernetes ingress currently targets `admin.oriso.site` and a service named `admin` on port `9000`.

## Ecosystem Role

`ORISO-Admin` is the control plane for the ORISO tenant ecosystem. It does not provide counseling UI itself; it configures tenants, agencies, users, permissions, messaging/legal/settings flags, and global system behavior that other ORISO applications depend on.

