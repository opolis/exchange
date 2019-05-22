const bitcoin = require('../lib/bitcoin');
const database = require('../lib/database');
const ethereum = require('../lib/ethereum');
const { api, env } = require('../lib/utils');

// Router manages valid event endpoints and executes their handlers
// when a match is found on the incoming lambda event (HTTP method + path)
class Router {
    constructor() {
        this.routes = {};
    }

    handle(method, path, handler) {
        this.routes[method + path] = handler;
    }

    go(event, callback) {
        let handler = this.routes[event.httpMethod + event.path];
        if (handler) {
            try {
                // parse environment
                const config = env.check(process.env, [
                    env._env('BTC_NETWORK', env.id),
                    env._env('DB_HOST', env.id),
                    env._env('DB_USER', env.id),
                    env._env('DB_PASSWORD', env.id),
                    env._env('DB_DATABASE', env.id),
                    env._env('MNEMONIC', env.id)
                ]);

                if (!config) { throw "missing environment variables" }

                const db = new database.MySQLDatabase({
                    host: config.DB_HOST,
                    user: config.DB_USER,
                    password: config.DB_PASSWORD,
                    database: config.DB_DATABASE
                });

                handler(callback, config, db, JSON.parse(event.body));

            } catch (error) {
                console.log('[error]', error);
                callback(null, api.error(error));
            }
        } else {
            callback(null, api.notFound());
        }
    }
}

exports.handler = (event, context, callback) => {
    const router = new Router();

    router.handle('POST', '/admin/address/btc', (cb, config, db, body) => {
        if ((body === null) || !body.payer) {
            cb(null, api.response(400, { message: "payer not specified" }));
            return;
        }

        // Generate new address based on last recorded address index
        const payer = db.payerByName(body.payer || null);
        if (!payer) {
            console.log('[warning] query for unknown payer');
            cb(null, api.response(400, { message: "unknown payer" }));
            return;
        }

        let index = 0;
        const latest = db.lastAddressByName(payer.name);
        if (latest) {
            index = latest.hd_address_index + 1;
        }

        const address = bitcoin.address(config.BTC_NETWORK, config.MNEMONIC, payer.hd_account, index);

        // Save and return new address
        db.saveAddress(payer.hd_account, database.COIN.BTC, address, index);
        cb(null, api.success({ payer: payer.name, coin: database.COIN.BTC, address: address }));
    });

    router.handle('POST', '/admin/address/eth', (cb, config, db, body) => {
        if ((body === null) || !body.payer) {
            cb(null, api.response(400, { message: "payer not specified" }));
            return;
        }

        // Generate a new address based on last recorded address index
        const payer = db.payerByName(body.payer || null);
        if (!payer) {
            console.log('[warning] query for unknown payer');
            cb(null, api.response(400, { message: "unknown payer" }));
            return;
        }

        let index = 0;
        const latest = db.lastAddressByName(payer.name);
        if (latest) {
            index = latest.hd_address_index + 1;
        }

        const address = ethereum.address(config.MNEMONIC, payer.hd_account, index);
        const save = ethereum.remove0x(address.toLowerCase());

        // Save and return new address
        db.saveAddress(payer.hd_account, database.COIN.ETH, save, index);
        cb(null, api.success({ payer: payer.name, coin: database.COIN.ETH, address: ethereum.add0x(address) }));
    });

    router.handle('POST', '/admin/payer', (cb, config, db, body) => {
        if ((body === null) || !body.name) {
            cb(null, api.response(400, { message: "payer name not specified" }));
            return;
        }

        const payer = body.name;

        // duplicate check
        if (db.payerByName(payer)) {
            cb(null, api.response(400, { message: "payer already exists" }));
            return;
        }

        // all good, save new payer
        db.savePayer(payer);
        cb(null, api.success({ message: "created new payer: " + payer }));
    });

    router.handle('GET', '/admin/key', (cb, config, db, body) => {
        console.log("noop");
        cb(null, api.success("ok"));

        // const bip39 = require('bip39');
        // const mnemonic = bip39.generateMnemonic(256);

        // const SecretsManager = require('aws-sdk/clients/secretsmanager');
        // const manager = new SecretsManager();

        // const params = {
        //     SecretId: "prod.wyre-exchange.wallet",
        //     SecretString: `{"mnemonic":"${mnemonic}"}`
        // };

        // manager.putSecretValue(params, (err, data) => {
        //     if (err) console.log(err);
        //     else console.log('saved!', data);
        // });

        // cb(null, api.success("ok"));
    });

    router.go(event, callback);
};
