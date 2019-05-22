const bitcoin = require('../lib/bitcoin');
const ethereum = require('../lib/ethereum');
const { networks } = require('bitcoinjs-lib');
const { api, env, key } = require('../lib/utils');

exports.handler = (event, context, callback) => {
    // const config = env.check(process.env, [ env._env('MNEMONIC', env.id) ]);
    // console.log(bitcoin.address("testnet", config.MNEMONIC, 0, 0));
    // console.log(ethereum.address(config.MNEMONIC, 0, 0));

    console.log('ok');
    callback(null, api.success("ok"));
};
