#!/usr/bin/env bash
set -e
openssl req -x509 -nodes -days 365 \
  -newkey rsa:2048 \
  -keyout ca.key \
  -out ca.crt \
  -subj "/CN=demo-ca"

openssl req -new -nodes -newkey rsa:2048 \
  -keyout server.key \
  -out server.csr \
  -subj "/CN=detector"
openssl x509 -req -days 365 -in server.csr \
  -CA ca.crt -CAkey ca.key -CAcreateserial -out server.crt

openssl req -new -nodes -newkey rsa:2048 \
  -keyout client.key \
  -out client.csr \
  -subj "/CN=demo-client"
openssl x509 -req -days 365 -in client.csr \
  -CA ca.crt -CAkey ca.key -CAcreateserial -out client.crt

rm -f server.csr client.csr ca.srl
echo "Created ca.crt, server.crt/key and client.crt/key"
