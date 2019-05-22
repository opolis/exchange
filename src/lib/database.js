const MySQL = require('sync-mysql');

const COIN = {
    BTC: 'BTC',
    ETH: 'ETH'
};

class MySQLDatabase {

    constructor(config) {
        this.config = config;
    }

    close() {
        this.connection.dispose();
    }

    _connection() {
        this.connection = new MySQL(this.config);
        return this.connection;
    }

    _result(result) {
        if (result.length > 0) {
            this.close();
            return result[0];
        }

        this.close();
        return undefined;
    }

    //
    // Query / Update
    //

    payerByName(name) {
        const stmt = `
            SELECT * FROM payers
            WHERE payers.name = ?
        `;

        return this._result(this._connection().query(stmt, [ name ]));
    }

    payerByAddress(address) {
        const stmt = `
            SELECT payers.name,
                   payers.hd_account,
                   addresses.id as address_id,
                   addresses.coin,
                   addresses.address,
                   addresses.hd_address_index
            FROM payers
            JOIN addresses
            ON payers.hd_account = addresses.payer_id
            WHERE addresses.address = ?
        `;

        return this._result(this._connection().query(stmt, [ address ]));
    }

    lastAddressByName(name) {
        const stmt = `
            SELECT payers.name,
                   payers.hd_account,
                   addresses.hd_address_index,
                   addresses.address
            FROM payers
            JOIN addresses
            ON payers.hd_account = addresses.payer_id
            WHERE payers.name = ?
            ORDER BY addresses.hd_address_index DESC LIMIT 1
        `;

        return this._result(this._connection().query(stmt, [ name ]));
    }

    savePayer(name) {
        const stmt = `
            INSERT INTO payers
            (name)
            VALUES
            (?)
        `;

        return this._result(this._connection().query(stmt, [ name ]));
    }

    saveAddress(payerId, coin, address, addressIndex) {
        const stmt = `
            INSERT INTO addresses
            (payer_id, coin, current_nonce, address, hd_address_index)
            VALUES
            (?, ?, ?, ?, ?)
        `;

        let nonce = null;
        if (coin == COIN.ETH) {
            nonce = 0;
        }

        return this._result(this._connection().query(stmt, [ payerId, coin, nonce, address, addressIndex ]));
    }

    incrementNonce(address) {
        // increment and return the correct nonce to use for ETH txs (atomically)
        const stmt = `
            UPDATE addresses
            SET current_nonce = (@nonce := current_nonce + 1)
            WHERE address = ?;
            SELECT @nonce;
        `;

        const result = this._connection().query(stmt, [ address ]);
        this.close();

        return result[1][0]['@nonce'] - 1;
    }

    initTransfer(info) {
        const stmt = `
            INSERT INTO transfers
            (address_id, coin, inbound_tx_id, inbound_amount, outbound_tx_id, outbound_amount, outbound_fee)
            VALUES
            (?, ?, ?, ?, ?, ?, ?)
        `;

        const args = [
            info.address_id,
            info.coin,
            info.inbound_tx_id,
            info.inbound_amount,
            info.outbound_tx_id,
            info.outbound_amount,
            info.outbound_fee
        ];

        return this._result(this._connection().query(stmt, args));
    }

    completeTransfer(outbound_tx_id, info) {
        const stmt = `
            UPDATE transfers SET
                transfer_id = ?,
                source_amount = ?,
                dest_amount = ?,
                exchange_rate = ?,
                exchange_fee = ?,
                message = ?
            WHERE outbound_tx_id = ?
        `;

        return this._result(this._connection().query(stmt, [
            info.transfer_id,
            info.source_amount,
            info.dest_amount,
            info.exchange_rate,
            info.exchange_fee,
            info.message,
            outbound_tx_id
        ]));
    }
}

module.exports = {
    COIN: COIN,
    MySQLDatabase: MySQLDatabase
};
