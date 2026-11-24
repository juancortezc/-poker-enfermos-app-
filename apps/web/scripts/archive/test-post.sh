#!/bin/bash

curl -X POST "http://localhost:3002/api/players" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ADMIN:test_admin_1765313385411" \
  -d '{
    "firstName": "Test",
    "lastName": "User",
    "role": "Invitado",
    "inviterId": "cmfbl19ge0007p8db9bphj9j7",
    "joinYear": 2025
  }'
