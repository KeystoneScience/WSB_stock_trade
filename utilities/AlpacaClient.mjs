import Alpaca from "@alpacahq/alpaca-trade-api";

import dotenv from "dotenv";
dotenv.config();

const alpaca = new Alpaca({
  keyId: process.env.ALPACA_KEY,
  secretKey: process.env.ALPACA_SECRET_KEY,
  paper: true,
});

const closeAllPositions = async () => {
  const positions = await alpaca.closeAllPositions();
  return positions;
};

const GetOrders = async () => {
  const orders = await alpaca.getOrders();
  return orders;
};

async function waitForOrdersToBeFilled() {
  await sleep(5000);
  const orders = await GetOrders();
  if (orders.length > 0) {
    console.log("Waiting for orders to be filled");
    await waitForOrdersToBeFilled();
  }
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const YOLOAllIn = async (symbol) => {
  //check to see if any orders are pending, if so, wait for them to be filled
  const orders = await GetOrders();
  if (orders.length > 0) {
    console.log("Waiting for orders to be filled");
    await waitForOrdersToBeFilled();
  }

  const cash = await getCash();
  try {
    const order = await alpaca.createOrder({
      symbol: symbol,
      notional: cash,
      side: "buy",
      type: "market",
      time_in_force: "day",
    });
    console.log("Successfully purchased $", cash, " worth of ", symbol);
    return order;
  } catch (error) {
    console.error("Could not purchase stocks: ", error);
    console.warn("Buying apple instead");
    const order = await alpaca.createOrder({
      symbol: "AAPL",
      notional: cash,
      side: "buy",
      type: "market",
      time_in_force: "day",
    });
  }
};

const getCash = async () => {
  const account = await alpaca.getAccount();
  return account.cash;
};

const getPositions = async () => {
  const positions = await alpaca.getPositions();
  return positions;
};

const getFineMonthPortfolioHistory = async (
  period = "1M",
  timeframe = "15Min",
  extended_hours = true
) => {
  try {
    const portfolioHistory = await alpaca.getPortfolioHistory({
      period,
      timeframe,
      extended_hours,
    });
    console.log(portfolioHistory);
    return portfolioHistory;
  } catch (err) {
    console.log(err);
  }
};

const getDayScalePortfolioHistory = async (
  period = "all",
  timeframe = "1D",
  extended_hours = true
) => {
  try {
    const portfolioHistory = await alpaca.getPortfolioHistory({
      period,
      timeframe,
      extended_hours,
    });
    return portfolioHistory;
  } catch (err) {
    console.log(err);
  }
};

const getFineDayPortfolioHistory = async (
  period = "1D",
  timeframe = "1Min",
  extended_hours = true
) => {
  try {
    const portfolioHistory = await alpaca.getPortfolioHistory({
      period,
      timeframe,
      extended_hours,
    });
    return portfolioHistory;
  } catch (err) {
    console.log(err);
  }
};

const getOrdersHistory = async () => {
  const closedOrders = await alpaca.getOrders({
    status: "closed",
    limit: 100,
    nested: true, // show nested multi-leg orders
  });
  return closedOrders;
};

const isTheMarketOpen = async () => {
  const clock = await alpaca.getClock();
  return clock.is_open;
};

export default {
  closeAllPositions,
  isTheMarketOpen,
  YOLOAllIn,
  getOrdersHistory,
  getPositions,
  getFineDayPortfolioHistory,
  getDayScalePortfolioHistory,
  getFineMonthPortfolioHistory,
};
