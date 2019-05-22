-- Visual design here https://www.dbdesigner.net/designer/schema/216957

-- BIP 44 Spec
-- m / purpose' / coin_type' / account' / change / address_index

CREATE TABLE payers (
    hd_account INTEGER PRIMARY KEY AUTO_INCREMENT,
    created TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    name TEXT NOT NULL
);

CREATE TABLE addresses (
    id INTEGER PRIMARY KEY AUTO_INCREMENT,
    created TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    payer_id INTEGER NOT NULL,
    coin TEXT NOT NULL, -- e.g. ETH or BTC
    current_nonce INTEGER, -- only for ETH addresses, NULL for BTC addresses
    address TEXT NOT NULL,
    hd_address_index INTEGER NOT NULL,
    FOREIGN KEY(payer_id) REFERENCES payers(hd_account)
);

CREATE TABLE transfers (
    id INTEGER PRIMARY KEY AUTO_INCREMENT,
    created TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- These fields are populated with data from the inbound "to payer address tx",
    -- and when forming/signing/broadcasting the "to wyre tx"
    address_id INTEGER NOT NULL,
    coin TEXT NOT NULL,
    inbound_tx_id TEXT NOT NULL,
    inbound_amount TEXT NOT NULL,
    outbound_tx_id TEXT NOT NULL,
    outbound_amount TEXT NOT NULL,
    outbound_fee TEXT NOT NULL,
    -- Grab all of the below from the wyre transfer response
    transfer_id TEXT,
    source_amount TEXT,
    dest_amount TEXT,
    exchange_rate TEXT,
    exchange_fee TEXT,
    message TEXT,
    FOREIGN KEY(address_id) REFERENCES addresses(id)
);
