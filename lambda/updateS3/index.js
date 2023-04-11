import AWS from "aws-sdk";
import { readFile } from "fs/promises";
import AlpacaClient from "../../utilities/AlpacaClient.mjs";
import dotenv from "dotenv";
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
  executeUpload({ items: items, bucket: "wsbdata", S3Path: "orders.json" });
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
