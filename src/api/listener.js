const coin = require('../lib/database').COIN;
const { api } = require('../lib/utils');

const DynamoDB = require('aws-sdk/clients/dynamodb');

// Listen for all transaction confirmations and push them to DynamoDB.
// New transaction records are then pushed onto a stream (by dynamo), which the processing handler reads from.
exports.handler = (event, context, callback) => {
    try {
        let currency;
        if (event.path == '/transaction/btc') currency = coin.BTC;
        if (event.path == '/transaction/eth') currency = coin.ETH;

        const tx = JSON.parse(event.body);
        const dynamodb = new DynamoDB();

        const request = {
            TableName: process.env.DYNAMODB_TABLE,
            Item: {
                "id": { S: tx.hash },
                "currency": { S: currency },
                "tx": { S: event.body }
            }
        };

        dynamodb.putItem(request, (err, data) => {
            if (err) {
                console.log('[error] could not write to dynamo', err);
                console.log('[info]', event.body);
                return;
            }

            console.log('[info] dynamo key', tx.hash);
        });

        callback(null, api.success("ok"));

    } catch (e) {
        console.log('[exception] could not push tx to dynamo', e);
        console.log('[info]', event.body);
        callback(null, api.ack("errors"));
    }
};
