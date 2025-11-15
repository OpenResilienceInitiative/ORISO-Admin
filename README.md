# ORISO Admin

## Overview
Admin dashboard application for managing the Online Beratung platform.

## Quick Start

### Build Docker Image
```bash
cd /home/caritas/Desktop/online-beratung/caritas-workspace/ORISO-Admin
docker build -t caritas-admin:latest .
sudo k3s ctr images import <(docker save caritas-admin:latest)
```

### Run Locally (Development)
```bash
cd /home/caritas/Desktop/online-beratung/caritas-workspace/ORISO-Admin
npm install
npm run dev
```

### Environment Configuration
Copy `.env.example` to `.env` and configure:

```bash
# API Configuration
VITE_API_URL=http://91.99.219.182

# Keycloak Configuration
VITE_KEYCLOAK_URL=http://91.99.219.182:8080
VITE_KEYCLOAK_REALM=online-beratung
VITE_KEYCLOAK_CLIENT_ID=admin-app
```

## Kubernetes Deployment
```bash
kubectl apply -f /home/caritas/Desktop/online-beratung/kubernetes-complete/03-frontend-admin.yaml
```

## Important Notes
- Uses Docker image: `caritas-admin:latest`
- Runs on port: `3000`
- Requires admin-level Keycloak credentials
- Environment variables are baked into the Docker image during build

## Dependencies
- Node.js 18+
- React 18
- Vite 4
- Keycloak JS adapter

## Access
- Admin panel accessible at: `http://91.99.219.182:3000`
- Login with Keycloak admin credentials
