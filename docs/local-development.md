# Local Development

This setup runs the Admin app on `localhost:9000`, points selected backend service calls to local services, and leaves every other API call on the configured remote API ingress.

## 1. Create `.env`

Copy the sample file:

    cp .env.example .env

For the ORISO dev environment, use these key values:

    VITE_PORT=9000
    BROWSER=none

    VITE_API_URL=https://api.oriso-dev.site
    VITE_APP_URL=https://app.oriso-dev.site
    VITE_MATRIX_URL=https://matrix.oriso-dev.site

    VITE_KEYCLOAK_URL=https://auth.oriso-dev.site
    VITE_KEYCLOAK_REALM=online-beratung
    VITE_KEYCLOAK_CLIENT_ID=app

    VITE_USE_API_URL=true
    VITE_USE_HTTPS=false
    VITE_COOKIE_DOMAIN=
    VITE_COOKIE_SECURE=false
    VITE_AUTH_COOKIE_PATH=/admin
    VITE_COOKIES_ALLOWEDLIST=devProxy
    VITE_CSRF_WHITELIST_HEADER_FOR_LOCAL_DEVELOPMENT=X-WHITELIST-HEADER

To run only UserService locally while the rest of Admin uses the remote dev API ingress:

    VITE_USER_SERVICE_ORIGIN=http://localhost:8082

To run more services locally, add only the services you need:

    VITE_TENANT_SERVICE_ORIGIN=http://localhost:8081
    VITE_AGENCY_SERVICE_ORIGIN=http://localhost:8084
    VITE_CONSULTING_TYPE_SERVICE_ORIGIN=http://localhost:8083

If you want to use API-hosted Keycloak through a different origin, set:

    VITE_KEYCLOAK_ORIGIN=https://api.oriso-dev.site

`VITE_KEYCLOAK_URL` still takes priority when it is configured. Use `VITE_KEYCLOAK_ORIGIN` only for the fallback `/auth` style URL.

The same values can also be provided with `REACT_APP_*` names for runtime `env.js` deployments.

## 2. Install dependencies

    npm ci --legacy-peer-deps

## 3. Run

    npm run start

Open:

    http://localhost:9000/admin

## Routing Behavior

* `VITE_USER_SERVICE_ORIGIN=http://localhost:8082` sends `/service/users` and `/service/useradmin` calls to local UserService.
* `VITE_TENANT_SERVICE_ORIGIN=http://localhost:8081` sends `/service/tenant`, `/service/tenant/public`, `/service/tenant/access`, and `/service/tenantadmin` calls to local TenantService.
* `VITE_AGENCY_SERVICE_ORIGIN=http://localhost:8084` sends `/service/agencyadmin` and `/service/topicadmin` calls to local AgencyService.
* `VITE_CONSULTING_TYPE_SERVICE_ORIGIN=http://localhost:8083` sends `/service/consultingtypes`, `/service/settings`, `/service/settingsadmin`, and `/service/topic` calls to local ConsultingTypeService.
* If a service-specific origin is absent, that service falls back to `VITE_API_URL`.
* `/service/statistics/registration` stays on `VITE_API_URL` because there is no confirmed service-specific ingress for that path.
* Keep service-specific origins commented unless you are running those services locally.

## Production compatibility

Production and Kubernetes deployments can keep the current broad API configuration:

    VITE_API_URL=https://api.oriso.org

With no service-specific origins set, Admin keeps generating the same broad API URLs as before.

## CORS

When a service origin points to `localhost`, that backend must allow the Admin app origin in CORS.
If CORS is not enabled on the backend, the browser will block the request even when the Admin URL is correct.
