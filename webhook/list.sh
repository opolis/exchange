#!/bin/bash
# NOTE: source .env to get blockcypher values

API_BASE=https://api.blockcypher.com/v1

echo 'webhooks active on BTC mainnet (btc/main):';
curl -s $API_BASE/btc/main/hooks?token=$BLOCKCYPHER_TOKEN
echo; echo;

echo 'webhooks active on ETH mainnet (eth/main):';
curl -s $API_BASE/eth/main/hooks?token=$BLOCKCYPHER_TOKEN
echo; echo;

echo 'webhooks active on BTC testnet (btc/test3):';
curl -s $API_BASE/btc/test3/hooks?token=$BLOCKCYPHER_TOKEN
echo; echo;
