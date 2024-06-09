#!/bin/bash

# Set your KV namespace ID
KV_NAMESPACE_ID="35d9ba93bccd4316b27a48bc72ceddad"

# wrangler kv:key list {--binding=<BINDING>|--namespace-id=<NAMESPACE_ID>} [OPTIONS]

# List all keys in the namespace and handle pagination
KEYS=()
LIMIT=1000
LAST_KEY=""
while :; do
  if [ -z "$LAST_KEY" ]; then
    RESPONSE=$(wrangler kv:key list --namespace-id $KV_NAMESPACE_ID --preview false)
  else
    RESPONSE=$(wrangler kv:key list --namespace-id $KV_NAMESPACE_ID --preview false --prefix $LAST_KEY)
  fi
  echo "Response from kv:key list: $RESPONSE"  # Debugging line
  NEW_KEYS=$(echo $RESPONSE | jq -r '.[] | .name')
  KEYS+=($NEW_KEYS)
  if [ ${#NEW_KEYS[@]} -lt $LIMIT ]; then
    break
  fi
  LAST_KEY=${NEW_KEYS[-1]}
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
