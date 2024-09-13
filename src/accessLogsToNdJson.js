import {
  fetchAccessLogZipFiles,
  fetchAccessLogZipFileAsStream,
} from "./s3/s3.js";
import { convertToNdJsonFile } from "./opensearch/opensearch.js";

async function accessLogsToNdJson() {
  const accessLogZipFiles = await fetchAccessLogZipFiles();
  for (const accessLogZipFile of accessLogZipFiles) {
    const accessLogZipFileAsStream = await fetchAccessLogZipFileAsStream(
      accessLogZipFile
    );
    convertToNdJsonFile(accessLogZipFileAsStream);
  }
}

accessLogsToNdJson();
