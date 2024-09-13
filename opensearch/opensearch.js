import { createGunzip } from "zlib";
import { Client } from "@opensearch-project/opensearch";
import { logger } from "../logger/logger.js";
import config from "../config/config.js";
import fs from "fs";
import axios from "axios";

let counter = 0;
let totalLines = 0;
const fieldsString =
  "timestamp date time x-edge-location sc-bytes c-ip cs-method cs(Host) cs-uri-stem sc-status cs(Referer) cs(User-Agent) cs-uri-query cs(Cookie) x-edge-result-type x-edge-request-id x-host-header cs-protocol cs-bytes time-taken x-forwarded-for ssl-protocol ssl-cipher x-edge-response-result-type cs-protocol-version fle-status fle-encrypted-fields c-port time-to-first-byte x-edge-detailed-result-type sc-content-type sc-content-len sc-range-start sc-range-end";
const fields = fieldsString.replaceAll("(", "_").replaceAll(")", "").split(" ");

function convertToNdJsonFile(accessLogZipFileAsStream) {
  const gzip = createGunzip();
  const unzippedStream = accessLogZipFileAsStream.pipe(gzip);

  let logsBuffer = "";

  unzippedStream.on("data", (data) => {
    logsBuffer += data.toString();
    if (logsBuffer.length > config.ndjson.bulkSize) {
      convertLogsBufferToNdJsonFile();
    }
  });

  unzippedStream.on("end", () => {
    convertLogsBufferToNdJsonFile(true);
  });

  unzippedStream.on("error", (err) => {
    logger.error("UnzippedStream error:", err);
  });

  function convertLogsBufferToNdJsonFile(final = false) {
    const logLines = logsBuffer.split("\n");
    if (final == false) {
      // Process all but the last line (which may be incomplete)
      const newLineDelimitedJsonLogs = convertToNdJsonLogs(logLines);
      appendToNdJsonFile(newLineDelimitedJsonLogs);

      // Set buffer to the last line (incomplete or complete doesn't matter)
      logsBuffer = logLines[logLines.length - 1];
    }

    if (final && logsBuffer.length > 0) {
      const newLineDelimitedJsonLogs = convertToNdJsonLogs(logLines, true);
      appendToNdJsonFile(newLineDelimitedJsonLogs);
    }
  }

  async function appendToNdJsonFile(newLineDelimitedJsonLogs) {
    logger.info(
      `Inserting ${newLineDelimitedJsonLogs.length} new line delimited json logs into the ndjson file ${config.ndjson.fileName}`
    );

    fs.appendFile(
      `${config.ndjson.fileName}`,
      newLineDelimitedJsonLogs,
      function (err) {
        if (err) {
          logger.error(
            `Error saving logs into: ${config.ndjson.fileName}`,
            err
          );
          throw err;
        }
      }
    );
  }
}

function index(accessLogZipFileAsStream) {
  const gzip = createGunzip();
  const unzippedStream = accessLogZipFileAsStream.pipe(gzip);

  let logsBuffer = "";

  unzippedStream.on("data", (data) => {
    logsBuffer += data.toString();
    if (logsBuffer.length > config.opensearch.bulkSize) {
      indexLogsBuffer();
    }
  });

  unzippedStream.on("end", () => {
    indexLogsBuffer(true);
  });

  unzippedStream.on("error", (err) => {
    logger.error("UnzippedStream error:", err);
  });

  function indexLogsBuffer(final = false) {
    const logLines = logsBuffer.split("\n");
    if (final == false) {
      // Process all but the last line (which may be incomplete)
      const newLineDelimitedJsonLogs = convertToNdJsonLogs(logLines);
      bulkIndex(newLineDelimitedJsonLogs);

      // Set buffer to the last line (incomplete or complete doesn't matter)
      logsBuffer = logLines[logLines.length - 1];
    }

    if (final && logsBuffer.length > 0) {
      const newLineDelimitedJsonLogs = convertToNdJsonLogs(logLines, true);
      bulkIndex(newLineDelimitedJsonLogs);
    }

    function bulkIndex(newLineDelimitedJsonLogs) {
      try {
        counter++;
        const startTime = performance.now();
        const endpoint = `${config.opensearch.node}/${config.opensearch.indexName}/_bulk`;
        axios.post(endpoint, newLineDelimitedJsonLogs, {
          httpsAgent: config.axios.agent,
          headers: {
            "Content-Type": "application/x-ndjson",
          },
        });
        const endTime = performance.now();
        const duration = endTime - startTime;
        const loglines = newLineDelimitedJsonLogs.split(/\r\n|\r|\n/).length;

        totalLines += loglines;

        logger.info(
          `Axios POST request ${counter} took ${duration / 1000} seconds for ${
            newLineDelimitedJsonLogs.length / 1024
          } Kbytes containing ${loglines} lines (avarage lines per bulk ${
            totalLines / counter
          } and total lines ${totalLines})`
        );
      } catch (error) {
        logger.error("Error indexing data:", error);
      }
    }
  }
}

function convertToNdJsonLogs(logLines, final = false) {
  let newLineDelimitedJsonLogs = "";
  const numberOfLogLinesProcessed = final
    ? logLines.length
    : logLines.length - 1;
  for (let i = 0; i < numberOfLogLinesProcessed; i++) {
    if (logLines[i].startsWith("#") || logLines[i] == "") {
      continue;
    }
    newLineDelimitedJsonLogs += transform(logLines[i]);
  }
  validateJson(newLineDelimitedJsonLogs);
  return newLineDelimitedJsonLogs;
}

function transform(logLine) {
  fields.forEach((field, index) => {
    if (index === 0) {
      const timeStamp = getTimeStamp(logLine);
      logLine = `{ "${field}":"${timeStamp}\t${logLine}" }`;
    }
    if (index >= 1) {
      logLine = replaceFirstTab(logLine, `","${field}":"`);
      if (field === "x-forwarded-for") {
        logLine = sanitizeXForwardedFor(logLine);
      }
    }
    if (index === fields.length - 1) {
      logLine = replaceFirstTab(logLine, `","${field}":"`);
    }
  });
  return `{ "index" : { "_index" : "${config.opensearch.indexName}" } }\n${logLine}\n`;
}

function getTimeStamp(logLine) {
  //get substring until first tab
  const date = logLine.substring(0, logLine.indexOf("\t"));
  //get substring after first tab until second tab
  const time = logLine.substring(
    logLine.indexOf("\t") + 1,
    logLine.indexOf("\t", logLine.indexOf("\t") + 1)
  );
  return `${date}T${time}`;
}

function replaceFirstTab(logLine, fieldName) {
  // Find the index of the first tab character
  const tabIndex = logLine.indexOf("\t");
  // If there is no tab, return the original string
  if (tabIndex === -1) {
    return logLine;
  }
  // Replace the first tab character with the replacement string
  return (
    logLine.substring(0, tabIndex) + fieldName + logLine.substring(tabIndex + 1)
  );
}

function sanitizeXForwardedFor(logLine) {
  const xForwardedFor = logLine.substring(
    logLine.indexOf('","x-forwarded-for":"') + 21,
    logLine.indexOf("\t")
  );

  if (xForwardedFor !== "-" && xForwardedFor.includes("\\")) {
    logLine = logLine.replace(xForwardedFor, "unknown");
  }
  return logLine;
}

function validateJson(newLineDelimitedJsonLogs) {
  newLineDelimitedJsonLogs.split("\n").forEach((log) => {
    if (log === "") {
      return;
    }
    try {
      JSON.parse(log);
    } catch (error) {
      logger.error("Error parsing log:", error);
      convertToNdJsonLogs.exit(1);
    }
  });
}

async function initializeOpensearch() {
  const opensearchClient = new Client({
    node: config.opensearch.node,
    ssl: {
      ca: fs.readFileSync(config.opensearch.rootCaFileLocation),
    },
  });

  const exists = await opensearchClient.indices.exists({
    index: config.opensearch.indexName,
  });

  if (exists.body) {
    await opensearchClient.indices.delete({
      index: config.opensearch.indexName,
    });
  }

  const index = await opensearchClient.indices.create(
    config.opensearch.createIndexParams
  );
}

export { convertToNdJsonFile, index, initializeOpensearch };
