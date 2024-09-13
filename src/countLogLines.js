import zlib from "zlib";
import config from "./config/config.js";
import { fetchAccessLogZipFiles, fetchAccessLogZipFile } from "./s3/s3.js";
import { logger } from "./logger/logger.js";

async function unzipAccessLogZipFile(accessLogZipFile, zipFile) {
  logger.info(`Unzipping access log zip file with key: ${zipFile.Key}`);
  const accessLogZipFileAsByteArray = await accessLogZipFile.transformToByteArray();
  const accessLogsAsString = zlib.gunzipSync(accessLogZipFileAsByteArray).toString("utf-8");
  const logsByLine = accessLogsAsString.split("\n");
  return logsByLine;
}

async function countLogLines() {
  let lineCount = 0;
  const accessLogZipFiles = await fetchAccessLogZipFiles();
  for (const accessLogZipFile of accessLogZipFiles) {
    const accessLogZipFileAsStream = await fetchAccessLogZipFile(
      accessLogZipFile
    );
    const logsByLine = await unzipAccessLogZipFile(
      accessLogZipFileAsStream.Body,
      accessLogZipFile
    );
    lineCount += logsByLine.length;
  }
  logger.info(`Total log line count for the s3 prefix ${config.cloudfront.prefix}: ${lineCount}`);
}

countLogLines();
