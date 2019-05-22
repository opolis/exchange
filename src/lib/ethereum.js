const ethers = require('ethers');
const { key } = require('./utils');
const wyre = require('./wyre');

const outputAddress = (tx) => {
    return (tx.outputs[0].addresses[0]).toLowerCase()
};

const add0x = (address) => {
    if (address.startsWith("0x")) {
        return address;
    }

    return "0x" + address;
};

const remove0x = (address) => {
    if (address.startsWith("0x")) {
        return address.substring(2);
    }

    return address;
};

const hdPath = (account, index) => {
    return `m/44'/60'/${account}'/0/${index}`;
};

// Generate a new ETH addresses for a given mnemonic, account, and index
const address = (mnemonic, account, index) => {
    const privateKey = key.eth(mnemonic, hdPath(account, index)).privateKey;
    const { address } = new ethers.Wallet(privateKey, ethers.getDefaultProvider('mainnet'));
    return address;
};

// Construct an ethereum transaction to sign.
// to = ethereum address as string (no 0x)
// bal = bigint
const txParams = (to, bal, nonce) => {
    let gasPrice = ethers.utils.parseUnits('10', 'gwei');
    let gasLimit = 21000;

    return {
        to: add0x(to),
        value: bal.sub(gasPrice * gasLimit),
        gasPrice: gasPrice,
        gasLimit: gasLimit,
        nonce: nonce
    };
};

// Process incoming tx and build an outbound ethereum tx to wyre
const generateTx = (config, payer, tx, provider, nonce) => {
    const privateKey = key.eth(config.MNEMONIC, hdPath(payer.hd_account, payer.hd_address_index)).privateKey;
    let wallet = new ethers.Wallet(privateKey, provider);

    return {
        wallet: wallet,
        txParams: txParams(config.WYRE_ADDRESS_ETH, ethers.utils.bigNumberify(tx.total.toString()), nonce)
    };
};

// Process inbound payment, craft outbound tx to wyre
const payment = (config, db, inboundTx, match) => {
    const payer = match.payer;
    const provider = ethers.getDefaultProvider('mainnet');

    const nonce = db.incrementNonce(payer.address);
    const toSend = generateTx(config, payer, inboundTx, provider, nonce);

    toSend.wallet.sendTransaction(toSend.txParams).then(outboundTx => {
        console.log('[info] sent ETH to wyre address', config.WYRE_ADDRESS_ETH, 'in tx', outboundTx.hash);

        db.initTransfer({
            address_id: payer.address_id,
            coin: 'ETH',
            inbound_tx_id: inboundTx.hash,
            inbound_amount: match.output.value.toString(),
            outbound_tx_id: remove0x(outboundTx.hash),
            outbound_amount: outboundTx.value.toString(),
            outbound_fee: (outboundTx.gasPrice * outboundTx.gasLimit).toString()
        });

        console.log('[info] created new ETH transfer record with outbound tx id', outboundTx.hash);
    }).catch(err => {
        console.log("[error] could not broadcast ETH tx to wyre", err);
    });
};

// Process exchange ETH -> USD
const exchange = (config, db, tx, match) => {
    const _exchange = (remaining, config, db, tx, match) => {
        wyre.exchangeToUSD(config, 'ETH', ethers.utils.formatEther(tx.total.toString()), 'Transfer from payer ' + match.payer.name)
            .then((transfer) => {
                console.log('[info] ETH transfer', transfer.id, transfer.desc);

                db.completeTransfer(tx.hash, {
                    transfer_id: transfer.id,
                    source_amount: transfer.sourceAmount,
                    dest_amount: transfer.destAmount,
                    exchange_rate: transfer.exchangeRate,
                    exchange_fee: transfer.totalFees,
                    message: transfer.message
                });

                console.log('[info] ETH transfer finalized with id', transfer.id);
            }, (error) => {
                // if we have remaining exchange attempts, try again
                if (remaining > 0) {
                    console.log('[error] ETH transfer', error, 'trying again with', remaining, 'attempts left');

                    setTimeout(function() {
                        _exchange(remaining - 1, config, db, tx, match);
                    }, 1000);
                } else {
                    console.log('[error] ETH transfer', error, 'no remaining retry attempts');
                }
            }).catch((error) => {
                console.log('[exception] ETH transfer', error, 'no remaining retry attempts');
            });
    };

    return _exchange(10, config, db, tx, match);
};

module.exports = {
    add0x: add0x,
    address: address,
    exchange: exchange,
    payment: payment,
    remove0x: remove0x
};
