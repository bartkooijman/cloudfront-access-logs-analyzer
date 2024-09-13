import {
  S3Client,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command
} from "@aws-sdk/client-s3";
import { S3ReadStream } from "s3-readstream";
import { logger } from "../logger/logger.js";
import config from "../config/config.js";

const s3Client = new S3Client({
  region: config.s3.region,
});

async function fetchAccessLogZipFiles() {
  const accessLogZipFiles = [];
  let continuationToken = null;

  do {
    const listObjectsV2CommandParams = {
      Bucket: config.cloudfront.accessLogBucket,
      MaxKeys: 1000,
      Prefix: config.cloudfront.prefix,
      ContinuationToken: continuationToken,
    };

    const listOfAccessLogZipFiles = await s3Client.send(
      new ListObjectsV2Command(listObjectsV2CommandParams)
    );
    accessLogZipFiles.push(...listOfAccessLogZipFiles.Contents);
    continuationToken = listOfAccessLogZipFiles.NextContinuationToken;
  } while (continuationToken);

  const totalSize = accessLogZipFiles.reduce((acc, obj) => acc + obj.Size, 0);
  logger.info(
    `Found ${
      accessLogZipFiles.length
    } access log zip files in ${config.cloudfront.accessLogBucket} with a total size of ${
      totalSize / 1024 / 1024
    } MB for prefix ${config.cloudfront.prefix}`
  );

  return accessLogZipFiles;
}

async function fetchAccessLogZipFileAsStream(accessLogZipFile) {
  const bucketParams = {
    Bucket: config.cloudfront.accessLogBucket,
    Key: accessLogZipFile.Key,
  };

  const headObjectCommand = new HeadObjectCommand(bucketParams);
  let headObject;
  try {
    headObject = await s3Client.send(headObjectCommand);
  } catch (err) {
    logger.error(
      "Error fetching head object (are you authenticated with AWS?):",
      err
    );
  }

  const options = {
    s3: s3Client,
    command: new GetObjectCommand(bucketParams),
    maxLength: headObject.ContentLength,
    byteRange: 1024 * 1024, // 1 MiB (optional - defaults to 64kb)
  };

  const stream = new S3ReadStream(options);
  return stream;
}

async function fetchAccessLogZipFile(accessLogZipFile) {
  const getObjectCommand = new GetObjectCommand({
    Bucket: config.cloudfront.accessLogBucket,
    Key: accessLogZipFile.Key,
  });

  let getObjectResponse;

  try {
    getObjectResponse = await s3Client.send(getObjectCommand);
  } catch (err) {
    logger.error(`Failed to fetch access log zip file with key ${accessLogZipFile.Key}`);
    logger.error(err);
  }

  return getObjectResponse;
}

export { fetchAccessLogZipFiles, fetchAccessLogZipFileAsStream, fetchAccessLogZipFile };
