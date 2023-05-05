import AWS from "aws-sdk";
import { readFile } from "fs/promises";
import AlpacaClient from "../../utilities/AlpacaClient.mjs";
import dotenv from "dotenv";
import pigpio from "pigpio";
const { Gpio } = pigpio;
dotenv.config();

AWS.config.update({
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY,
  secretAccessKey: process.env.AWS_SECRET_KEY,
});

async function readJSON(filepath) {
  const json = JSON.parse(await readFile(new URL(filepath, import.meta.url)));
  return json;
}

function uploadJsonToS3(file, bucket, key) {
  var buf = Buffer.from(JSON.stringify(file));
  var s3 = new AWS.S3();
  var params = {
    Bucket: bucket,
    Key: key,
    Body: buf,
    ContentEncoding: "base64",
    ContentType: "application/json",
    ACL: "public-read",
  };
  s3.upload(params, function (err, data) {
    if (err) {
      console.log(err);
    } else {
      console.log("Successfully uploaded data to S3");
    }
  });
}

async function executeUpload({
  fileToUploadPath,
  bucket = "wsbdata",
  S3Path,
  items,
}) {
  //   const items = await readJSON(fileToUploadPath);
  uploadJsonToS3(items, bucket, S3Path);
}

async function fetchData() {}

async function start() {
  const orderHistory = await AlpacaClient.getOrdersHistory();
  const positions = await AlpacaClient.getPositions();
  const dayScaleHistory = await AlpacaClient.getDayScalePortfolioHistory();
  const items = formatJSONForS3({ orderHistory, positions, dayScaleHistory });
  updateLEDIndicator(items);
  executeUpload({ items: items, bucket: "wsbdata", S3Path: "orders.json" });
}

async function updateLEDIndicator({ profit_loss_pct }) {
  const redLed = new Gpio(4, { mode: Gpio.OUTPUT });
  const greenLed = new Gpio(17, { mode: Gpio.OUTPUT });
  const blueLed = new Gpio(27, { mode: Gpio.OUTPUT });

  const MAX_POWER = 150;

  const IS_LOSS = profit_loss_pct[profit_loss_pct.length - 1] < 0;

  if (IS_LOSS) {
    //make the led red
    redLed.pwmWrite(MAX_POWER);
    greenLed.pwmWrite(0);
    blueLed.pwmWrite(0);
  } else {
    //make the led green
    redLed.pwmWrite(0);
    greenLed.pwmWrite(MAX_POWER);
    blueLed.pwmWrite(0);
  }
}

function formatJSONForS3({ orderHistory, positions, dayScaleHistory }) {
  const orders = [];
  orderHistory.forEach((order) => {
    orders.push({
      symbol: order.symbol,
      price: order.filled_avg_price,
      quantity: order.filled_qty,
      date: order.filled_at,
      side: order.side,
    });
  });

  const currentPositions = [];
  positions.forEach((position) => {
    currentPositions.push({
      symbol: position.symbol,
      price: position.current_price,
      quantity: position.qty,
    });
  });

  return {
    orders,
    positions: currentPositions,
    history: dayScaleHistory,
  };
}

export default {
  executeUpload,
  fetchData,
  start,
};
