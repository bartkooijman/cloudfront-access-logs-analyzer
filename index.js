import zlib from "zlib";
import {
  fetchAccessLogZipFiles,
  fetchAccessLogZipFileAsStream,
  fetchAccessLogZipFile,
} from "./s3/s3.js";
import { logger } from "./logger/logger.js";
import { index } from "./opensearch/opensearch.js";
import { toCvs } from "./csv/csv.js";

async function unzipAccessLogZipFile(accessLogZipFile, zipFile) {
  logger.info(`Unzipping access log zip file with key: ${zipFile.Key}`);

  const transformed = await accessLogZipFile.transformToByteArray();
  const loggies = zlib.gunzipSync(transformed).toString("utf-8");
  logger.info(loggies.length / 1024);
  const loggiesByLine = loggies.split("\n");
  logger.info(loggiesByLine.length);
  return loggiesByLine;
}

async function run() {
  let lines = 0;
  const accessLogZipFiles = await fetchAccessLogZipFiles();
  for (const accessLogZipFile of accessLogZipFiles) {
    const accessLogZipFileAsStream = await fetchAccessLogZipFile(
      accessLogZipFile
    );
    const logsByLine = await unzipAccessLogZipFile(
      accessLogZipFileAsStream.Body,
      accessLogZipFile
    );
    lines += logsByLine.length;
  }
  logger.info(lines);
}

async function runStreaming() {
  const accessLogZipFiles = await fetchAccessLogZipFiles();
  for (const accessLogZipFile of accessLogZipFiles) {
    const accessLogZipFileAsStream = await fetchAccessLogZipFileAsStream(
      accessLogZipFile
    );
    //delay the process for 500ms to avoid overloading openserach (which doesnt seem to work)
    //await new Promise((resolve) => setTimeout(resolve, 500));
    //index(accessLogZipFileAsStream);
    toCvs(accessLogZipFileAsStream);
  }
}

runStreaming();
//run();
