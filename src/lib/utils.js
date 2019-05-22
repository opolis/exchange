const bitcoin = require('bitcoinjs-lib');
const bip32 = require('bip32');
const bip39 = require('bip39');
const ethers = require('ethers');

//
// ENV
//

// ENV var transformers
const id = (id) => { return id };
const toNumber = (s) => { return parseInt(s, 10) };
const toBool = (s) => { if (s == 'true') { return true; } return false; };
const _env = (key, transform) => { return { key: key, transform: transform } };

// Return a configuration object built from values in the environment.
// If a required environment variable is missing, `null` is returned.
const envCheck = (env, required) => {
    let config = {};

    for (r of required) {
        if (!env[r.key]) {
            console.log('[error] missing environment variable', r.key);
            return null;
        }

        // transform the env var value according
        // to its specified transformer
        config[r.key] = r.transform(env[r.key]);
    }

    return config;
};

//
// API
//

// callback helpers
const ack = (data) => {
    return {
        "statusCode": 200,
        "body": JSON.stringify(data)
    };
};

const error = (data) => {
    return {
        "statusCode": 500,
        "body": JSON.stringify(data)
    };
};

const success = (data) => {
    return {
        "statusCode": 200,
        "body": JSON.stringify(data)
    };
};

const response = (code, data) => {
    return {
        "statusCode": code,
        "body": JSON.stringify(data)
    };
};

//
// Keys
//

const keyBTC = (mnemonic, path, network) => {
    return bip32.fromSeed(bip39.mnemonicToSeed(mnemonic), network).derivePath(path);
};

const keyETH = (mnemonic, path) => {
    return ethers.utils.HDNode.fromMnemonic(mnemonic).derivePath(path);
};

//
// Transactions
//

// Check to see if the tx has an output to a unique payer address (one this hot-wallet owns)
// and return the output and payer if so, null otherwise
const matchOutput = (db, tx) => {
    let vout;
    for (vout = 0; vout < tx.outputs.length; vout++) {
        let output = tx.outputs[vout];
        let payer = db.payerByAddress(output.addresses[0]);
        if (payer) {
            output.vout = vout;
            return { type: 'payment', output: output, payer: payer };
        }
    }

    return null;
};

// Check to see if the tx has an input from this hot-wallet AND an output
// to the specified wyre address. Return the input, output, and payer if so,
// otherwise, return null
const matchWyre = (db, tx, wyreAddress) => {
    let input = null;
    let output = null;
    let payer = null;

    for (inp of tx.inputs) {
        let match = db.payerByAddress(inp.addresses[0]);
        if (match) {
            payer = match;
            input = inp;
            break;
        }
    }

    let vout;
    for (vout = 0; vout < tx.outputs.length; vout++) {
        let out = tx.outputs[vout];
        let addr = out.addresses[0];
        if (addr == wyreAddress) {
            output = out;
            output.vout = vout;
            break;
        }
    }

    if ((input && output) && payer) {
        return { type: 'wyre', input: input, output: output, payer: payer };
    }

    return null;
};

const thresholdMet = (tx, threshold) => {
    if (tx.confirmations.valueOf() >= threshold) {
        return true;
    }

    return false;
};

module.exports = {
    api: {
        ack: ack,
        error: error,
        response: response,
        success: success
    },
    env: {
        id: id,
        toNumber: toNumber,
        toBool: toBool,
        check: envCheck,
        _env: _env
    },
    key: {
        btc: keyBTC,
        eth: keyETH
    },
    transaction: {
        matchOutput: matchOutput,
        matchWyre: matchWyre,
        thresholdMet: thresholdMet
    }
};
