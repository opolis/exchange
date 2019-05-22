#!/bin/bash
# NOTE: source .env to get blockcypher values
# PARAMETERS: $1 = network (e.g. btc/main), $2 = webhook ID

curl -s \
     -XDELETE \
     https://api.blockcypher.com/v1/$1/hooks/$2?token=$BLOCKCYPHER_TOKEN
