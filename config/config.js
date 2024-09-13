import fs from "fs";
import https from "https";

const args = process.argv.length > 2 ? process.argv[2].split(" ") : [];
const dayArg = args.find((arg) => arg.startsWith("--day="));
const dayValue = dayArg ? dayArg.split("=")[1] : null;
const logToConsoleArg = args.find((arg) => arg.startsWith("--logToConsole="));
const logToConsole = logToConsoleArg ? logToConsoleArg.split("=")[1] === "true" : false;

const OPENSEARCH_CREDENTIALS = {
  adminUser: "admin",
  adminPwd: "Tijdelijk0!",
};

const OPENSEARCH_INDEX = {
  name: "access-logs",
  numberOfShards: 12,
  numberOfReplicas: 0,
};

const OPENSEARCH_CONFIG = {
  node: `https://${OPENSEARCH_CREDENTIALS.adminUser}:${OPENSEARCH_CREDENTIALS.adminPwd}@localhost:9200`,
  indexName: OPENSEARCH_INDEX.name,
  bulkSize: 1024 * 1024 * 1,
  rootCaFileLocation: "root-ca.pem",
  createIndexParams: {
    index: OPENSEARCH_INDEX.name,
    body: {
      settings: {
        index: {
          number_of_shards: OPENSEARCH_INDEX.numberOfShards,
          number_of_replicas: OPENSEARCH_INDEX.numberOfReplicas,
          //refresh_interval: "-1",
          translog: {
              flush_threshold_size: "1024MB",
          }
        },
      },
    },
  },
};

const S3_CONFIG = {
  region: "eu-west-1",
};

const CLOUDFRONT_S3_CONFIG = {
  accessLogBucket: "ig-elblogging",
  accessLogFolder: "CF/",
  distributionId: "E3J8XYXNMM9IQS",
  accessLogYear: "2024",
  accessLogMonth: "08",
  accessLogDay: dayValue ? dayValue : "32",
};

const CLOUDFRONT_CONFIG = {
  accessLogBucket: CLOUDFRONT_S3_CONFIG.accessLogBucket,
  accessLogFolder: CLOUDFRONT_S3_CONFIG.accessLogFolder,
  distributionId: CLOUDFRONT_S3_CONFIG.distributionId,
  accessLogYear: CLOUDFRONT_S3_CONFIG.accessLogYear,
  accessLogMonth: CLOUDFRONT_S3_CONFIG.accessLogMonth,
  accessLogDay: CLOUDFRONT_S3_CONFIG.accessLogDay,
  prefix: CLOUDFRONT_S3_CONFIG.accessLogFolder + CLOUDFRONT_S3_CONFIG.distributionId + "." + CLOUDFRONT_S3_CONFIG.accessLogYear + "-" + CLOUDFRONT_S3_CONFIG.accessLogMonth + "-" + CLOUDFRONT_S3_CONFIG.accessLogDay
};

const AXIOS_ROOT_CA = {
  rootCa: fs.readFileSync("root-ca.pem"),
};

const AXIOS_CONFIG = {
  agent: new https.Agent({
    ca: AXIOS_ROOT_CA.rootCa,
  }),
};

const LOGGER_CONFIG = {
  logToConsole: logToConsole,
  logFilePrefix: CLOUDFRONT_S3_CONFIG.distributionId + "." + CLOUDFRONT_S3_CONFIG.accessLogYear + "-" + CLOUDFRONT_S3_CONFIG.accessLogMonth + "-" + CLOUDFRONT_S3_CONFIG.accessLogDay
};

const NDJSON_CONFIG = {
  fileName: CLOUDFRONT_S3_CONFIG.distributionId + "-" + CLOUDFRONT_S3_CONFIG.accessLogYear + "-" + CLOUDFRONT_S3_CONFIG.accessLogMonth + "-" + CLOUDFRONT_S3_CONFIG.accessLogDay + ".json",
};

const CSV_CONFIG = {
  fileName: CLOUDFRONT_S3_CONFIG.distributionId + "-" + CLOUDFRONT_S3_CONFIG.accessLogYear + "-" + CLOUDFRONT_S3_CONFIG.accessLogMonth + "-" + CLOUDFRONT_S3_CONFIG.accessLogDay + ".csv",
};

const config = {
  axios: AXIOS_CONFIG,
  cloudfront: CLOUDFRONT_CONFIG,
  csv: CSV_CONFIG,
  logger: LOGGER_CONFIG,
  ndjson: NDJSON_CONFIG,
  opensearch: OPENSEARCH_CONFIG,
  s3: S3_CONFIG,
};

export default config;
