import fs from "fs";
function convertCSVtoJSON(csv) {
  const csvArray = csv.split("\n");
  const keys = csvArray[0].split(",");
  const values = csvArray.slice(1);
  const json = values.map((value) => {
    const valueArray = value.split(",");
    const json = {};
    valueArray.forEach((value, index) => {
      json[keys[index]] = value;
    });
    return json;
  });
  return json;
}

function readCSV() {
  const csv = fs.readFileSync("NASDAQ.csv", "utf8");
  const json = convertCSVtoJSON(csv);
  fs.writeFileSync("NASDAQ.json", JSON.stringify(json));
}

readCSV();
