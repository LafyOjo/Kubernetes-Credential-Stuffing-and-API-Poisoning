# infra/kind/up.sh
#!/usr/bin/env bash
set -e
bash infra/kind/00-create-cluster.sh
kubectl create ns demo
bash infra/kind/01-prom-grafana.sh
kubectl apply -f infra/kind/sock-shop.yaml
echo "Done! Port-forward front-end, Grafana & Prometheus in separate shells."
