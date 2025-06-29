#!/usr/bin/env bash
set -e
openssl req -x509 -nodes -days 365 \
  -newkey rsa:2048 \
  -keyout server.key \
  -out server.crt \
  -subj "/CN=detector/O=demo"
echo "Created server.crt and server.key"
