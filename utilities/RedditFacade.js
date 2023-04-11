import puppeteer from "puppeteer";
import dotenv from "dotenv";
dotenv.config();

const SUBREDDIT_SUBMIT_TEXT_URL = (subreddit) =>
  `https://old.reddit.com/r/${subreddit}/submit?selftext=true`;

const self = {
  browser: null,
  page: null,

  initialize: async function () {
    self.browser = await puppeteer.launch({
      headless: false,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
      ignoreHTTPSErrors: true,
    });
    self.page = await self.browser.newPage();
  },

  login: async function (username, password) {
    await self.page.goto("https://www.reddit.com/login/", {
      waitUntil: "networkidle0",
    });

    //fill out the form
    await self.page.type("#loginUsername", username, { delay: 30 });
    await self.page.type("#loginPassword", password, { delay: 30 });

    //click the login button
    await self.page.keyboard.press("Enter");

    //wait for 5 seconds
    await self.page.waitFor(5000);
  },

  post: async function (subreddit, data = {}) {
    switch (data.type) {
      case "text":
        console.log("Navigating to text submission page");
        await self.page.goto(SUBREDDIT_SUBMIT_TEXT_URL(subreddit));
        console.log("typing");
        await self.page.type('textarea[name="title"]', data.title, {
          delay: 30,
        });
        await self.page.type('textarea[name="text"]', data.text, { delay: 30 });
        await self.page.click('button[name="submit"]');

        break;
      // case "link":
      //   await self.page.goto(SUBREDDIT_SUBMIT_LINK_URL(subreddit), {
      //     waitUntil: "networkidle0",
      //   });
      //   await self.page.type("#url", data.title, { delay: 30 });
      //   await self.page.type('textarea[name="title"]', data.text, {
      //     delay: 30,
      //   });
      //   break;
    }
  },
};

async function main() {
  //A stupid captcha is blocking the post. This method is not useful for that... though you could use it to scrape if you are a masochist.
  await self.initialize();
  await self.login(process.env.REDDIT_USERNAME, process.env.REDDIT_PASSWORD);
  await self.post("KeystoneScience", {
    type: "text",
    title: "test",
    text: "test text",
  });
}

main();
