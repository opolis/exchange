#!/bin/bash

# Provide the bucket name as the first paramter
sam package --s3-bucket $1 --output-template-file sam.package.yaml
