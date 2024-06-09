#!/bin/bash

# Set your KV namespace ID
KV_NAMESPACE_ID="35d9ba93bccd4316b27a48bc72ceddad"

# List all keys in the namespace and handle pagination
KEYS=()
CURSOR=""
while :; do
  RESPONSE=$(wrangler kv:key list --namespace-id $KV_NAMESPACE_ID --cursor $CURSOR --preview false)
  echo "Response from kv:key list: $RESPONSE"  # Debugging line
  NEW_KEYS=$(echo $RESPONSE | jq -r '.keys[].name')
  KEYS+=($NEW_KEYS)
  CURSOR=$(echo $RESPONSE | jq -r '.cursor')
  if [ "$CURSOR" == "null" ]; then
    break
  fi
done

# Initialize an empty JSON object
echo "{" > kv_dump.json

# Iterate through the keys and fetch their values
for KEY in "${KEYS[@]}"; do
  VALUE=$(wrangler kv:key get $KEY --namespace-id $KV_NAMESPACE_ID --preview false)
  echo "Response from kv:key get for $KEY: $VALUE"  # Debugging line
  VALUE=$(echo $VALUE | jq -R -s .)
  echo "\"$KEY\": $VALUE," >> kv_dump.json
done

# Remove the last comma and close the JSON object
truncate -s-2 kv_dump.json
echo "}" >> kv_dump.json

echo "KV store data has been dumped to kv_dump.json"
