#!/bin/bash
# NOTE: source .env to get blockcypher values
# PARAMETERS: $1 = network (e.g. btc/main), $2 = address to watch, $3 = confirmations, $4 = webhook URL
# Example: ./webhook/create.sh btc/main 1FE...A3F 3 https://api.gateway.com/api/transaction/btc

curl -s \
     -d "{\"event\": \"tx-confirmation\", \"confirmations\": $3, \"address\": \"$2\", \"url\": \"$4\"}" \
     https://api.blockcypher.com/v1/$1/hooks?token=$BLOCKCYPHER_TOKEN
