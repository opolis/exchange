// Usage: node admin/key.js

const https = require('https');
const v4 = require('aws-signature-v4');

const url = v4.createPresignedURL(
    'GET', 'jvrfla4osk.execute-api.us-west-2.amazonaws.com', // TODO: change to master deploy URL
    '/api/admin/key',
    'execute-api', '',
    {
        region: 'us-west-2',
        expires: 10 // seconds
    }
);

https.get(url, (response) => {
    response.on('data', (d) => { process.stdout.write(d); });
}).on('error', (e) => {
    console.error(e);
});
