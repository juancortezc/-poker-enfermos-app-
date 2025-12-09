#!/bin/bash

# Get Juan Tapia's ID first
JUAN_ID=$(curl -s "http://localhost:3002/api/players?search=Juan%20Tapia" | jq -r '.[0].id')

echo "Juan Tapia ID: $JUAN_ID"
echo ""

# Try to create Guido Andrade
echo "Creating Guido Andrade..."
curl -X POST "http://localhost:3002/api/players" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer \$2b\$10\$V.zOHPHiM0sr9YpnyFR7YuWlI5BFQ4iUL98NK2r2SVfYXYQ1Tjjx6" \
  -d "{
    \"firstName\": \"Guido\",
    \"lastName\": \"Andrade\",
    \"role\": \"Invitado\",
    \"aliases\": [],
    \"inviterId\": \"$JUAN_ID\",
    \"photoUrl\": \"https://storage.googleapis.com/poker-enfermos/pato.png\",
    \"joinYear\": 2025
  }" | jq .
