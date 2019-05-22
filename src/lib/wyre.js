const ethers = require('ethers');
const utils = require('./utils');

const WyreClient = require('@wyre/api').WyreClient;

// sourceUnit<String> "BTC" or "ETH",
// amount<String> amount in wei or satoshi
const exchangeToUSD = (config, sourceUnit, amount, message) => {
    let wyreParams = {
        format: "json_numberstring",
        apiKey: config.WYRE_API_KEY,
        secretKey: config.WYRE_SECRET_KEY
    };

    if (!config.WYRE_PROD) {
        // testwyre endpoint
        wyreParams.baseUrl = "https://api.testwyre.com/";
    }

    const wyre = new WyreClient(wyreParams);
    return wyre.post("/transfers", {
        sourceAmount: amount,
        sourceCurrency: sourceUnit,
        destCurrency: "USD",
        dest: config.WYRE_ACCOUNT_ID,
        amountIncludesFees: true,
        message: message,
        autoConfirm: true
    });
};

module.exports = {
    exchangeToUSD: exchangeToUSD
};
