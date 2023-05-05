//This is the main server, it will have multiple cron jobs running in the background.
//One will be to execute trades on every market dat an hour after market opening,
//and one will be to fetch portfolio information and use the updateS3 file to update the JSON file in S3
import cron from "node-cron";

import ExecuteTrades from "./lambda/execute_trades/index.js";
import UpdateS3 from "./lambda/updateS3/index.js";

async function main() {
  await ExecuteTrades.start();
  await UpdateS3.start();
  cron.schedule(
    "0 9 * * 1-5",
    async () => {
      console.log("running a task every weekday at 9am");
      try {
        ExecuteTrades.start();
      } catch (e) {
        console.error(e);
      }
    },
    {
      scheduled: true,
      timezone: "America/Denver",
    }
  );
  //run the update S3 file every 4 hours
  cron.schedule("0 */4 * * *", async () => {
    console.log("running a task every 4 hours");
    try {
      UpdateS3.start();
    } catch (e) {
      console.error(e);
    }
  });
}

main();
