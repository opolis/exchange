const bitcoin = require('../lib/bitcoin');
const database = require('../lib/database');
const ethereum = require('../lib/ethereum');
const wyre = require('../lib/wyre');
const { api, env, transaction } = require('../lib/utils');

const LosslessJSON = require('lossless-json');

// NOTE: On Error Handling
// While it would be ideal to return actual errors when they exist,
// we are unable to do so until we implement a DLQ (dead-letter queue)
// From AWS docs:
//   Poll-based event sources that are stream-based – These consist of Kinesis Data Streams or DynamoDB.
//   When a Lambda function invocation fails, AWS Lambda attempts to process the erring batch of records until
//   the time the data expires, which can be up to seven days.
//
//   The exception is treated as blocking, and AWS Lambda will not read any new records from the shard until
//   the failed batch of records either expires or is processed successfully. This ensures that AWS Lambda processes
//   the stream events in order.
//
// All this is to say, we are currently better off just logging the error or exception, sending a notification to slack
// and retrying the tx manually by fetching it from the Dynamo table.

// Handle the initial environment processing and database connection
// before passing down to the core handler function (handler)
const init = (handler) => {
    return (event, context, callback) => {
        try {
            const config = env.check(process.env, [
                env._env('BLOCKCYPHER_TOKEN', env.id),
                env._env('BTC_FEE', env.toNumber),
                env._env('BTC_NETWORK', env.id),
                env._env('BTC_THRESHOLD', env.toNumber),
                env._env('DB_HOST', env.id),
                env._env('DB_USER', env.id),
                env._env('DB_PASSWORD', env.id),
                env._env('DB_DATABASE', env.id),
                env._env('ETH_THRESHOLD', env.toNumber),
                env._env('MNEMONIC', env.id),
                env._env('WYRE_ADDRESS_BTC', env.id),
                env._env('WYRE_ADDRESS_ETH', env.id),
                env._env('WYRE_ACCOUNT_ID', env.id),
                env._env('WYRE_API_KEY', env.id),
                env._env('WYRE_SECRET_KEY', env.id),
                env._env('WYRE_PROD', env.toBool),
            ]);

            if (!config) {
                console.log("[error] missing environment variables");
                callback(null, "errors");
                return;
            }

            const db = new database.MySQLDatabase({
                host: config.DB_HOST,
                user: config.DB_USER,
                password: config.DB_PASSWORD,
                database: config.DB_DATABASE,
                multipleStatements: true
            });

            // Process each incoming TX.
            // Generally, this loop will only iterate once, but there's
            // no reason it couldn't handle multiple.
            for (r of event.Records) {
                if (!(r.eventName == 'INSERT' || r.eventName == 'MODIFY')) {
                    console.log('[info] received an event type other than INSERT or MODIFY, noop');
                    continue;
                }

                const tx = LosslessJSON.parse(r.dynamodb.NewImage.tx.S);
                const coin = r.dynamodb.NewImage.currency.S;
                handler(config, db, coin, tx);
            }

        } catch (e) {
            console.log("[exception] could not process tx", e);
            callback(null, "errors");
            return;
        }

        callback(null, "ok");
    };
};

// Process incoming payment.
// Create and send outbound transaction to wyre
const payment = (coin, config, db, tx, match) => {
    if (coin == database.COIN.BTC) {
        return bitcoin.payment(config, db, tx, match);
    }

    if (coin == database.COIN.ETH) {
        return ethereum.payment(config, db, tx, match);
    }
};

// Process exchange.
// Transfer recently recieved crypto to USD.
const exchange = (coin, config, db, tx, match) => {
    if (coin == database.COIN.BTC) {
        return bitcoin.exchange(config, db, tx, match);
    }

    if (coin == database.COIN.ETH) {
        return ethereum.exchange(config, db, tx, match);
    }
};

// Listen for all dynamo stream events, and process the contained transaction.
// (Because of Dynamo's stream processing semantics, we are guaranteed no duplicate tx objects)
exports.handler = init((config, db, coin, tx) => {
    // Grab confirmation threshold and wyre address by coin
    let threshold;
    let wyreAddress;
    if (coin == database.COIN.BTC) {
        threshold = config.BTC_THRESHOLD;
        wyreAddress = config.WYRE_ADDRESS_BTC;
    }

    if (coin == database.COIN.ETH) {
        threshold = config.ETH_THRESHOLD;
        wyreAddress = config.WYRE_ADDRESS_ETH;
    }

    if (!transaction.thresholdMet(tx, threshold)) {
        console.log('[info] confirmation threshold not met for tx',
            tx.hash, 'have', tx.confirmations.toString(), 'need', threshold);
        return;
    }

    // Matching Conditions
    // (in order of precedence)
    // 1. tx has at least one output paying to this wallet
    // 2. tx has at least once input signed by this wallet, and one output to the wyre address
    const match = transaction.matchOutput(db, tx) || transaction.matchWyre(db, tx, wyreAddress);
    if (!match) {
        console.log('[info] transaction with no output(s) to operate on', coin, tx.hash);
        return;
    }

    if (match.type == 'payment') {
        payment(coin, config, db, tx, match);
        return;
    }

    if (match.type == 'wyre') {
        exchange(coin, config, db, tx, match);
        return;
    }
});
