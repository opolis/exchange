const { transaction, env } = require('./utils');
const LosslessJSON = require('lossless-json');

describe('utility functions', () => {

    afterEach(() => {
        delete process.env.FOO;
        delete process.env.BAR;
    });

    test ('env.check', () => {
        process.env.FOO = 'foo';
        process.env.BAR = 'bar';

        var result = env.check(process.env, [ env._env('FOO', env.id), env._env('BAR', env.id) ])
        expect(result).toStrictEqual({FOO: 'foo', BAR: 'bar'});

        process.env.FOO = '100';
        process.env.BAR = 'true'

        result = env.check(process.env, [ env._env('FOO', env.toNumber), env._env('BAR', env.toBool) ])
        expect(result).toStrictEqual({FOO: 100, BAR: true});

        result = env.check(process.env, [ env._env('BAZ', env.id) ])
        expect(result).toBe(null);
    });

    test('transaction.thresholdMet', () => {
        var tx = LosslessJSON.parse('{"confirmations": 0}');
        expect(transaction.thresholdMet(tx, 10)).toBe(false);

        tx = LosslessJSON.parse('{"confirmations": 5}');
        expect(transaction.thresholdMet(tx, 10)).toBe(false);

        tx = LosslessJSON.parse('{"confirmations": 10}');
        expect(transaction.thresholdMet(tx, 10)).toBe(true);

        tx = LosslessJSON.parse('{"confirmations": 15}');
        expect(transaction.thresholdMet(tx, 10)).toBe(true);
    });

});
