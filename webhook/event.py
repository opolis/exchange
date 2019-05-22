# Generate a dynamo event for local testing.
# Usage: python webhook/event.py COIN tx.json
# where coin is BTC or ETH

import json
import sys
from string import Template

TEMPLATE='''
{
  "Records": [
    {
      "eventID": "c4ca4238a0b923820dcc509a6f75849b",
      "eventName": "INSERT",
      "eventVersion": "1.1",
      "eventSource": "aws:dynamodb",
      "awsRegion": "us-west-2",
      "dynamodb": {
        "Keys": {
          "id": { "S": "$id" }
        },
        "NewImage": {
          "id": { "S": "$id" },
          "currency": { "S": "$coin" },
          "tx": { "S": "$tx" }
        },
        "ApproximateCreationDateTime": 1428537600,
        "SequenceNumber": "4421584500000000017450439091",
        "SizeBytes": 0,
        "StreamViewType": "NEW_IMAGE"
      },
      "eventSourceARN": "arn:aws:dynamodb:us-west-2:123456789012:table/exchange/stream/2015-06-27T00:48:05.899"
    }
  ]
}
'''

coin = sys.argv[1]
txFile = sys.argv[2]

with open(txFile, 'r') as f:
    data = f.read()
    tx = json.loads(data)
    txId = tx['hash']

    print Template(TEMPLATE).substitute(
        id=txId,
        coin=coin,
        tx=data.replace('"', '\\"').replace('\n', '\\n')
    )
