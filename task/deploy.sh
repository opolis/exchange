#!/bin/bash

# Provide parameters file as first argument
sam deploy --template-file sam.package.yaml --stack-name opolis-exchange --capabilities CAPABILITY_IAM --parameter-overrides $(cat $1 | tr '\n' ' ')
