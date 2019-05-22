// Usage: node admin/address.js ENDPOINT COIN PAYER

const https = require('https');
const v4 = require('aws-signature-v4');
const { parse } = require('url');

const endpoint = process.argv[2];
const coin = process.argv[3];
const payer = process.argv[4];
const data = JSON.stringify({ payer: payer });

if (process.env.AWS_DEFAULT_REGION === undefined) {
    console.log('AWS_DEFAULT_REGION env var must be set');
    process.exit(1);
}

const url = parse(v4.createPresignedURL(
    'POST', endpoint,
    '/api/admin/address/' + coin.toLowerCase(),
    'execute-api', data,
    {
        region: process.env.AWS_DEFAULT_REGION,
        expires: 10, // seconds
        headers: {
            'Content-Type': 'application/json'
        }
    }
));

const options = {
    host: url.host,
    method: 'POST',
    path: url.path,
    port: 443,
    headers: {
        'Content-Type': 'application/json'
    }
};

const request = https.request(options, (response) => {
    response.on('data', (d) => { process.stdout.write(d); });
}).on('error', (e) => {
    console.error(e);
});

request.write(data);
request.end();
