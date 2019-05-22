INSERT INTO payers (name) VALUES ('BTCPayer'); -- id 1
INSERT INTO payers (name) VALUES ('ETHPayer'); -- id 2

-- address path: m/49'/1'/1'/0/0
INSERT INTO addresses (payer_id, coin, current_nonce, address, hd_address_index)
    VALUES (1, 'BTC', NULL, "2N4msoZ5LbqnNRNweT3Uao7S5MVpDsRqE4w", 0);

-- address path: m/44'/60'/2'/0/0
INSERT INTO addresses (payer_id, coin, current_nonce, address, hd_address_index)
    VALUES (2, 'ETH', 0, "f91987c8f6468c98fffd02ae68e6f8a64f9ea35f", 0);
