import {
  fetchAccessLogZipFiles,
  fetchAccessLogZipFileAsStream,
} from "./s3/s3.js";
import { convertToCsvFile } from "./csv/csv.js";

async function accessLogsToCsv() {
  const accessLogZipFiles = await fetchAccessLogZipFiles();
  for (const accessLogZipFile of accessLogZipFiles) {
    const accessLogZipFileAsStream = await fetchAccessLogZipFileAsStream(
      accessLogZipFile
    );
    convertToCsvFile(accessLogZipFileAsStream);
  }
}

accessLogsToCsv();