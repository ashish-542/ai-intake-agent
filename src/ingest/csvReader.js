const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");

function readCSV() {
    return new Promise((resolve, reject) => {

        const results = [];

        const filePath = path.join(__dirname, "../../data/mock_leads.csv");

        fs.createReadStream(filePath)
            .pipe(csv())
            .on("data", (row) => {
                results.push(row);
            })
            .on("end", () => {
                resolve(results);
            })
            .on("error", (error) => {
                reject(error);
            });

    });
}

module.exports = readCSV;