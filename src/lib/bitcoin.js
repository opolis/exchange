const bcypher = require('blockcypher');
const bitcoin = require('bitcoinjs-lib');
const wyre = require('./wyre');
const { key } = require('./utils');

// Map network config to network object
const parseNetwork = (n) => {
    if (n == 'testnet') {
        return bitcoin.networks.testnet;
    }

    return bitcoin.networks.bitcoin;
};

// Create an instance of the blockcypher client
const api = (network, token) => {
    if (network == 'testnet') {
        return new bcypher('btc', 'test3', token);
    }

    return new bcypher('btc', 'main', token);
};

// satoshis -> bitcoin
const fromSatoshis = (sats) => {
    return sats / (10**8);
};

// build a valid BTC path (P2SH(P2WPKH))
const hdPath = (network, account, index) => {
    if (network === bitcoin.networks.testnet) {
        return `m/49'/1'/${account}'/0/${index}`;
    }

    return `m/49'/0'/${account}'/0/${index}`;
}

// Build a P2SH(P2WPKH) script
const p2sh = (keyPair, network) => {
    return bitcoin.payments.p2sh({
        redeem: bitcoin.payments.p2wpkh({ pubkey: keyPair.publicKey, network: network }),
        network: network
    });
};

// Generate a new P2SH(P2WPKH) address for a given mnemonic, account, and index
const address = (network, mnemonic, account, index) => {
    const _network = parseNetwork(network);

    const keyPair = key.btc(mnemonic, hdPath(_network, account, index), _network);
    const { address } = p2sh(keyPair, _network);

    return address;
};

// Build a transaction that spends a UTXO locked to us
const transaction = (network, fromTx, vout, to, amount, fee, redeem, keyPair) => {
    const txb = new bitcoin.TransactionBuilder(network);

    txb.addInput(fromTx, vout);
    txb.addOutput(to, amount - fee);
    txb.sign(0, keyPair, redeem.output, bitcoin.Transaction.SIGHASH_ALL, amount);

    return txb.build();
};

// Process incoming BTC transaction.
// Given an output we own, create a tx that sends to wyre
const generateTx = (config, payer, output, tx) => {
    let network = parseNetwork(config.BTC_NETWORK);
    const kp = key.btc(config.MNEMONIC, hdPath(network, payer.hd_account, payer.hd_address_index), network);
    return transaction(
        network,
        tx.hash,
        output.vout,
        config.WYRE_ADDRESS_BTC,
        output.value.valueOf(),
        config.BTC_FEE,
        p2sh(kp, network).redeem,
        kp
    );
};

// Craft outbound transaction to wyre
const payment = (config, db, tx, match) => {
    const outTx = generateTx(config, match.payer, match.output, tx);
    const bcAPI = api(config.BTC_NETWORK, config.BLOCKCYPHER_TOKEN);

    bcAPI.pushTX(outTx.toHex(), (error, receipt) => {
        try {
            if (error) {
                console.log('[error] BTC could not broadcast tx', error);
            } else {
                console.log('[info] sent BTC to wyre address', config.WYRE_ADDRESS_BTC, 'in tx', receipt.tx.hash);
                db.initTransfer({
                    address_id: match.payer.address_id,
                    coin: 'BTC',
                    inbound_tx_id: tx.hash,
                    inbound_amount: match.output.value.toString(),
                    outbound_tx_id: receipt.tx.hash,
                    outbound_amount: receipt.tx.total.toString(),
                    outbound_fee: receipt.tx.fees.toString()
                });

                console.log('[info] created new BTC transfer record with outbound tx id', receipt.tx.hash);
            }
        } catch (e) {
            console.log('[exception] could not process tx broadcast', e);
        }
    });
};

// BTC -> USD
const exchange = (config, db, tx, match) => {
    const _exchange = (remaining, config, db, tx, match) => {
        wyre.exchangeToUSD(config, 'BTC', fromSatoshis(match.output.value), 'Transfer from payer ' + match.payer.name)
            .then((transfer) => {
                console.log('[info] BTC transfer', transfer.id, transfer.desc);

                db.completeTransfer(tx.hash, {
                    transfer_id: transfer.id,
                    source_amount: transfer.sourceAmount,
                    dest_amount: transfer.destAmount,
                    exchange_rate: transfer.exchangeRate,
                    exchange_fee: transfer.totalFees,
                    message: transfer.message
                });

                console.log('[info] BTC transfer finalized with id', transfer.id);
            }, (error) => {
                // if we have remaining exchange attempts, try again
                if (remaining > 0) {
                    console.log('[error] BTC transfer', error, 'trying again with', remaining, 'attempts left');

                    setTimeout(function() {
                        _exchange(remaining - 1, config, db, tx, match);
                    }, 1000);
                } else {
                    console.log('[error] BTC transfer', error, 'no remaining retry attempts');
                }
            }).catch((error) => {
                console.log('[exception] BTC transfer', error, 'no remaining retry attempts');
            });
    };

    return _exchange(10, config, db, tx, match);
};

module.exports = {
    address: address,
    exchange: exchange,
    fromSatoshis: fromSatoshis,
    hdPath: hdPath,
    payment: payment
};
