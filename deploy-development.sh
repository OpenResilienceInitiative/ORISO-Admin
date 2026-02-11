#!/bin/bash
set -e
echo "🔨 Building admin..."
cd /root/online-beratung/ORISO-Complete/caritas-workspace/ORISO-Admin
npm run build

echo "🐳 Building Docker image..."
TIMESTAMP=$(date +%s)
IMAGE_TAG="caritas-admin:dev-${TIMESTAMP}"
docker build -t ${IMAGE_TAG} .
docker tag ${IMAGE_TAG} caritas-admin:latest

echo "📦 Importing image into k3s..."
docker save ${IMAGE_TAG} | sudo k3s ctr images import - > /dev/null 2>&1
docker save caritas-admin:latest | sudo k3s ctr images import - > /dev/null 2>&1

echo "🚀 Restarting deployment..."
kubectl rollout restart deployment/oriso-platform-admin -n caritas
kubectl rollout status deployment/oriso-platform-admin -n caritas --timeout=120s

echo "✅ Admin deployed successfully!"
echo "📋 Checking pod status..."
kubectl get pods -n caritas -l app=admin

echo "🔍 Verifying image details..."
kubectl get pod -n caritas -l app=admin -o jsonpath='{.items[0].spec.containers[0].image}{"\n"}'
kubectl get pod -n caritas -l app=admin -o jsonpath='{.items[0].status.containerStatuses[0].imageID}{"\n"}'

