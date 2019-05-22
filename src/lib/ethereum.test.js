const { add0x, address, remove0x } = require('./ethereum');

// addresses checked against output from: https://iancoleman.io/bip39/
const MNEMONIC = 'dial paddle drama bomb sail actual nature immune scare orchard mean wink';

describe('ethereum lib', () => {

    test('add0x', () => {
        var addr = '0x3c50C2ef429d795d0A980009Be91dB81F977A690';
        expect(add0x(addr)).toBe(addr);

        addr = '3c50C2ef429d795d0A980009Be91dB81F977A690';
        expect(add0x(addr)).toBe('0x' + addr);
    });

    test('address', () => {
        expect(address(MNEMONIC, 0, 0)).toBe('0x3c50C2ef429d795d0A980009Be91dB81F977A690');
        expect(address(MNEMONIC, 0, 1)).toBe('0x99Cf0e7AccBdcdfB7E3afe4e2435791CC71E9a1d');
        expect(address(MNEMONIC, 1, 0)).toBe('0x9c7B8b6F7Ba12e84F26CFD46fa398Fb70aE4c1Aa');
    });

    test('remove0x', () => {
        var with0x = '0x3c50C2ef429d795d0A980009Be91dB81F977A690';
        var without0x = '3c50C2ef429d795d0A980009Be91dB81F977A690';
        expect(remove0x(with0x)).toBe(without0x);
        expect(remove0x(without0x)).toBe(without0x);
    });
});
