const bitcoin = require('bitcoinjs-lib');
const { address, fromSatoshis, hdPath } = require('./bitcoin');

// addresses checked against output from: https://iancoleman.io/bip39/
const MNEMONIC = 'dial paddle drama bomb sail actual nature immune scare orchard mean wink';

describe('bitcoin lib', () => {

    test('address', () => {
        var network = 'mainnet';
        expect(address(network, MNEMONIC, 0, 0)).toBe('3PortdkfrKsvAU4oXDj4bk8i57EcpPiiru');
        expect(address(network, MNEMONIC, 0, 1)).toBe('3PEjgpjamx6s38nDRYumBEqjeJF6cmMSSf');
        expect(address(network, MNEMONIC, 1, 0)).toBe('398nQ1HLb2SsNVHrPfZEKVQvP3nT5GU9ot');

        network = 'testnet';
        expect(address(network, MNEMONIC, 0, 0)).toBe('2N4aVz2koDHao5mb963TShQ4RYUcwXf5Gq5');
        expect(address(network, MNEMONIC, 0, 1)).toBe('2MuZsH12hN2t5USRhPN2kM7JDbokoA7VQAD');
        expect(address(network, MNEMONIC, 1, 0)).toBe('2N3Uq5XmM1LAwWmtkGBE7A2fud2PW5Bg4qz');
    });

    test('fromSatoshis', () => {
        expect(fromSatoshis(10000000000)).toBe(100);
        expect(fromSatoshis(1000000000)).toBe(10);
        expect(fromSatoshis(100000000)).toBe(1);
        expect(fromSatoshis(10000000)).toBe(0.1);
        expect(fromSatoshis(1000000)).toBe(0.01);
    });

    test('hdPath', () => {
        var network = bitcoin.networks.bitcoin;
        expect(hdPath(network, 0, 0)).toBe("m/49'/0'/0'/0/0");
        expect(hdPath(network, 0, 1)).toBe("m/49'/0'/0'/0/1");
        expect(hdPath(network, 1, 0)).toBe("m/49'/0'/1'/0/0");
        expect(hdPath(network, 1, 1)).toBe("m/49'/0'/1'/0/1");

        network = bitcoin.networks.testnet;
        expect(hdPath(network, 0, 0)).toBe("m/49'/1'/0'/0/0");
        expect(hdPath(network, 0, 1)).toBe("m/49'/1'/0'/0/1");
        expect(hdPath(network, 1, 0)).toBe("m/49'/1'/1'/0/0");
        expect(hdPath(network, 1, 1)).toBe("m/49'/1'/1'/0/1");
    });

});
