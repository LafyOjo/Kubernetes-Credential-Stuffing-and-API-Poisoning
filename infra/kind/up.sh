# infra/kind/up.sh
#!/usr/bin/env bash
set -e
bash infra/kind/00-create-cluster.sh
kubectl create ns demo
bash infra/kind/01-prom-grafana.sh
# Deploy the demo shop application from the bundled manifests
kubectl apply -f infra/kind/demo-shop.yaml
echo "Done! Port-forward front-end, Grafana & Prometheus in separate shells."
