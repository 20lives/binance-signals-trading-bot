require('dotenv').config();
const crypto = require('crypto');
const fetch = require('node-fetch');

const keys = {
  apikey: process.env.APIKEY,
  apisecret: process.env.APISECRET,
};

const baseURL = 'https://fapi.binance.com';
const endPoints = {
  order: '/fapi/v1/order',
  leverage: '/fapi/v1/leverage',
  marginType: '/fapi/v1/marginType',
  balance: '/fapi/v2/balance',
  exchangeInfo: '/fapi/v1/exchangeInfo',
};

const BUY = 'BUY';
const SELL = 'SELL';
const LIMIT = 'LIMIT';
const ISOLATED = 'ISOLATED';
const CROSSED = 'CROSSED';
const STOP_MARKET = 'STOP_MARKET';

const serialize = (obj = {}) => Object.entries(obj).map(([key, val]) => `${key}=${val}`).join('&');

const createSignature = str => crypto.createHmac('sha256', keys.apisecret).update(str).digest('hex');

const url = (endPoint, data) => { 
  const queryString = serialize(data);
  const signature = createSignature(queryString);
  return `${baseURL}${endPoint}?${queryString}&signature=${signature}`;
};

const headers = { 'X-MBX-APIKEY': keys.apikey };

const sendRequest = (endPoint, method, data) => fetch(url(endPoint, data), { method, headers }).then(x => x.json());

const order = ({ symbol, side, type, quantity, price }) => {
  const data = {
    symbol,
    type,
    side,
    timeInForce: 'GTC',
    quantity,
    price,
    recvWindow: 5000,
    timestamp: Date.now(),
  };
  return sendRequest(endPoints.order, 'POST', data);
};

const close = ({ symbol, side, stopPrice }) => {
  const data = {
    closePosition: 'true',
    symbol,
    stopPrice,
    type: STOP_MARKET,
    side,
    timeInForce: 'GTC',
    recvWindow: 5000,
    timestamp: Date.now(),
  };
  return sendRequest(endPoints.order, 'POST', data);
};

const leverage = ({ symbol, leverage }) => {
  const data = {
    symbol,
    leverage,
    recvWindow: 5000,
    timestamp: Date.now(),
  };
  return sendRequest(endPoints.leverage, 'POST', data);
};

const marginType = ({ symbol, marginType }) => {
  const data = {
    symbol,
    marginType,
    recvWindow: 5000,
    timestamp: Date.now(),
  };
  return sendRequest(endPoints.marginType, 'POST', data);
};

const balance = () => {
  const data = {
    recvWindow: 5000,
    timestamp: Date.now(),
  };
  return sendRequest(endPoints.balance, 'GET', data);
};

const exchangeInfo = () => {
  return sendRequest(endPoints.exchangeInfo, 'GET');
};

(async () => {
  const symbol = 'ETCUSDT';
  const side = SELL;
  const opposite_side = side == SELL ? BUY : SELL;
  const leverageValue = 5;
  const percent = 12;
  const marginTypeValue = ISOLATED;
  const price = '62.123';
  const stopPrice = '68.420';

  let res;

  res = await exchangeInfo({ symbol });
  const symbolInfo = res.symbols.find(x => x.symbol == symbol);

  const balanceRes = await balance();
  const { availableBalance } = balanceRes.find(x => x.asset == 'USDT');

  const amount = availableBalance * leverageValue * ( percent / 100);
  const quantity =  (amount / price).toFixed(symbolInfo.quantityPrecision);

  res = await leverage({ symbol, leverage: leverageValue });
  console.log(res);

  console.log('availableBalance: ', availableBalance);
  console.log('amount: ', amount);
  console.log('quantity: ', quantity);

  res = await marginType({ symbol, marginType: marginTypeValue });
  console.log(res);

  res = await order({ symbol, side, type: LIMIT, quantity, price });
  console.log(res);

  res = await close({ symbol, side: opposite_side, stopPrice });
  console.log(res);

})();


