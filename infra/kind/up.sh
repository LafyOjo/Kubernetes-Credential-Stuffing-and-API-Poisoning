# infra/kind/up.sh
#!/usr/bin/env bash
set -e
bash infra/kind/00-create-cluster.sh
kubectl create ns demo
bash infra/kind/01-prom-grafana.sh
kubectl apply -f https://raw.githubusercontent.com/microservices-demo/microservices-demo/master/deploy/kubernetes/complete-demo.yaml
echo "Done! Port-forward front-end, Grafana & Prometheus in separate shells."