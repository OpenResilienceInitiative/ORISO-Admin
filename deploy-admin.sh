#!/bin/bash
set -e
echo "🔨 Building admin..."
cd /home/caritas/Desktop/online-beratung/caritas-workspace/ORISO-Admin
npm run build

echo "🐳 Building Docker image..."
docker build -t caritas-admin:latest .

echo "📦 Importing image into k3s..."
docker save caritas-admin:latest | sudo k3s ctr images import - > /dev/null 2>&1

echo "🚀 Restarting deployment..."
kubectl rollout restart deployment/admin -n caritas
kubectl rollout status deployment/admin -n caritas --timeout=120s

echo "✅ Admin deployed successfully!"
kubectl get pods -n caritas -l app=admin









