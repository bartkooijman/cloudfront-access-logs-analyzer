import {
  fetchAccessLogZipFiles,
  fetchAccessLogZipFileAsStream,
} from "./s3/s3.js";
import { index } from "./opensearch/opensearch.js";

async function indexAccessLogs() {
  const accessLogZipFiles = await fetchAccessLogZipFiles();
  for (const accessLogZipFile of accessLogZipFiles) {
    const accessLogZipFileAsStream = await fetchAccessLogZipFileAsStream(
      accessLogZipFile
    );
    //delay the process for 500ms to avoid overloading openserach (which doesnt seem to work)
    //await new Promise((resolve) => setTimeout(resolve, 500));
    index(accessLogZipFileAsStream);
  }
}

indexAccessLogs();
