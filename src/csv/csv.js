import { logger } from "../logger/logger.js";
import { createGunzip } from "zlib";
import config from "../config/config.js";
import fs from "fs";

const fieldsString =
  "timestamp date time x-edge-location sc-bytes c-ip cs-method cs(Host) cs-uri-stem sc-status cs(Referer) cs(User-Agent) cs-uri-query cs(Cookie) x-edge-result-type x-edge-request-id x-host-header cs-protocol cs-bytes time-taken x-forwarded-for ssl-protocol ssl-cipher x-edge-response-result-type cs-protocol-version fle-status fle-encrypted-fields c-port time-to-first-byte x-edge-detailed-result-type sc-content-type sc-content-len sc-range-start sc-range-end";
const fields = fieldsString.replaceAll("(", "-").replaceAll(")", "").replaceAll(" ", ",");

function convertToCsvFile(accessLogZipFileAsStream) {
  if (!fs.existsSync(config.csv.fileName)) fs.writeFileSync(config.csv.fileName, fields + "\n");

  const gzip = createGunzip();
  const unzippedStream = accessLogZipFileAsStream.pipe(gzip);

  let logsBuffer = "";

  unzippedStream.on("data", (data) => {
    logsBuffer += data.toString();
    if (logsBuffer.length > config.opensearch.bulkSize) {
      convertLogsBufferToCsvFile();
    }
  });

  unzippedStream.on("end", () => {
    convertLogsBufferToCsvFile(true);
  });

  unzippedStream.on("error", (err) => {
    logger.error("UnzippedStream error:", err);
  });

  function convertLogsBufferToCsvFile(final = false) {
    const logLines = logsBuffer.split("\n");
    if (final == false) {
      // Process all but the last line (which may be incomplete)
      const newLineDelimitedLogs = convertToCsv(logLines);
      appendToCsvFile(newLineDelimitedLogs);

      // Set buffer to the last line (incomplete or complete)
      logsBuffer = logLines[logLines.length - 1];
    }

    if (final && logsBuffer.length > 0) {
      const newLineDelimitedLogs = convertToCsv(logLines, true);
      appendToCsvFile(newLineDelimitedLogs);
    }
  }

  function convertToCsv(logLines, final = false) {
    let commaSeparatedLogs = "";
    const numberOfLogLinesProcessed = final ? logLines.length : logLines.length - 1;
    for (let i = 0; i < numberOfLogLinesProcessed; i++) {
      if (logLines[i].startsWith("#") || logLines[i] == "") {
        continue;
      }
      commaSeparatedLogs += transform(logLines[i]);
    }
    return commaSeparatedLogs;
  }

  function transform(logLine) {
    logLine = addTimeStamp(logLine);
    //add quotes around each value
    logLine = logLine.replaceAll("\t", '","');
    //add quotes around the whole line
    logLine = `\"${logLine}\"`;
    return `${logLine}\n`;
  }

  function addTimeStamp(logLine) {
    //get substring until first tab
    const date = logLine.substring(0, logLine.indexOf("\t"));
    //get substring after first tab until second tab
    const time = logLine.substring(
      logLine.indexOf("\t") + 1,
      logLine.indexOf("\t", logLine.indexOf("\t") + 1)
    );
    return `${date}T${time}\t` + logLine;
  }

  function appendToCsvFile(commaSeparatedLogs) {
    logger.info(
      `Inserting ${commaSeparatedLogs.length} comma separated logs into csv file ${config.csv.fileName}`
    );

    fs.appendFile(
      `${config.csv.fileName}`,
      commaSeparatedLogs,
      function (err) {
        if (err) {
          logger.error(
            `Error saving logs into: ${config.csv.fileName}`,
            err
          );
          throw err;
        }
      }
    );
  }
}

export { convertToCsvFile };