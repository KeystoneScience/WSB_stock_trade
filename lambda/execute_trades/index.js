import fetch from "node-fetch";
import dotenv from "dotenv";
import fs from "fs";
dotenv.config();

import AlpacaClient from "../../utilities/AlpacaClient.mjs";

import { Configuration, OpenAIApi } from "openai";
const configuration = new Configuration({
  apiKey: process.env.OPEN_AI_KEY,
});
const openai = new OpenAIApi(configuration);

async function evaluate(prompt) {
  if (!prompt) {
    return "";
  }
  const completion = await openai.createCompletion({
    model: "text-davinci-003",
    prompt: prompt,
  });

  let promptReturn = completion.data.choices[0].text;
  console.log("RAW PROMPT RESPONSE: ", promptReturn);
  const promptReturnSplit = promptReturn.split(" ");
  promptReturn = promptReturnSplit[promptReturnSplit.length - 1];
  // remove any \n from the prompt return
  promptReturn = promptReturn.replace(/\W/g, "");

  return promptReturn.toLowerCase();
}

//https://www.reddit.com/dev/api/
async function fetchRedditPost() {
  const response = await fetch(
    "https://www.reddit.com/user/OPINION_IS_UNPOPULAR.json?sort=new&limit=50"
  );
  const json = await response.json();
  //get the newest post that contains the string "What Are Your Moves Tomorrow"
  const latestPost = json.data.children.find((post) => {
    return post.data.title.includes("What Are Your Moves Tomorrow");
  }).data;

  if (!latestPost) throw new Error("No post found!");

  //remove last path on url
  const commentPermalinkArray = latestPost.url.split("/");
  commentPermalinkArray.pop();
  commentPermalinkArray.pop();
  const permalink = commentPermalinkArray.join("/") + ".json?sort=top";

  //get comments from latest post
  const commentResponse = await fetch(permalink);
  const commentJson = await commentResponse.json();
  return commentJson[1].data.children;
}

function generateCommentsString(redditPostComments) {
  let commentString = "";
  redditPostComments.forEach((comment) => {
    if (commentString.length > 10000) {
      return;
    }
    let currentComment = comment.data.body;
    if (!currentComment) {
      return;
    }

    //on the current comment, delete any text that is of the form [*](*)
    //this will delete any links in the comment
    currentComment = currentComment.replace(/\[.*\]\(.*\)/g, "");
    //delete any emojis from currentComment
    currentComment = currentComment.replace(/[\u{1F600}-\u{1F64F}]/gu, "");
    currentComment = currentComment.replace(
      /([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g,
      ""
    );

    commentString +=
      `>` + currentComment + ` (${comment.data.score} People Agree.)` + "\n";
  });
  return commentString;
}

function getTicker(stockName) {
  const lowercaseStockNameInput = stockName.toLowerCase();
  //read in the JSON file
  const data = fs.readFileSync("NASDAQ.json");
  //parse the JSON file into a JSON object
  const json = JSON.parse(data);
  //itterate through the JSON object and find the stock name or ticker
  for (let i = 0; i < json.length; i++) {
    const stock = json[i];
    //convert the stock name and ticker to lowercase
    const lowercaseStockSymbol = stock.Symbol.toLowerCase();
    const lowercaseStockName = stock.Name.toLowerCase();
    //check to see if either the symbol or name contain the stock name or ticker
    if (
      lowercaseStockSymbol.includes(lowercaseStockNameInput) ||
      lowercaseStockName.includes(lowercaseStockNameInput)
    ) {
      console.log("MATCH FOUND: ", stock.Symbol, "");
      return stock.Symbol;
    }
  }
  console.error("NO MATCH FOUND FOR: ", lowercaseStockNameInput, "");
  //if the stock is not found, return AAPL
  return "AAPL";
}

async function start() {
  //check to see if the market is open
  const isMarketOpen = await AlpacaClient.isTheMarketOpen();
  if (!isMarketOpen) {
    console.log("Market is closed");
    return;
  }
  console.log("Market is open, running algorithm...");

  const comments = await fetchRedditPost();
  const commentsString = generateCommentsString(comments);
  const prompt = `The following are comments on a reddit stock trading thread. Please return the stock that people in this group talked about most positively. Return only the name of the stock: ${commentsString}`;
  const result = await evaluate(prompt);
  console.log("RESULT: ", result);
  const ticker = getTicker(result);
  console.log("Symbol: ", ticker);

  const portfolio = await AlpacaClient.getPositions();
  const previousStockTicker = portfolio[0].symbol;
  var isHolding = true;
  if (ticker !== previousStockTicker) {
    isHolding = false;
  }

  if (!isHolding) {
    await AlpacaClient.closeAllPositions();
    await AlpacaClient.YOLOAllIn(ticker);
  } else {
    console.log("Holding the stock");
  }
}

export default {
  start,
};
