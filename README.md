# CloudFront access logs analyzer
This repo contains a set of scripts written in JavaScript and running on Node.js v20 that can support you with analyzing your CloudFront Access Logs. While the name of the repo seems to suggest that the repo contains a complete analysis tool it does not yet (appologies). You need something like e.g. Google BigQuery or OpenSearch to perform the real analysis. However, the scripts do help you in sending your access logs to these kind of analysis solutions.

There are 5 scripts located in the ./src directory:
1. **accessLogsToCsv.js**: this script downloads a set of CloudFront Access Logs .gz files from an S3 bucket, unzips them, converts every line in the resulting access log file to CSV's and then puts them into a file that can be used for for example Google BigQuery for analysis.
2. **accessLogsToNdJson.js**: this script does the same as the above script but instead creates new line delimited json files. These files are also containing index json lines so that the file could be used for bulk indexing into OpenSearch or Elasticsearch.
3. **indexAccessLogs.js**: this script does the same as the accessLogsToNdJson.js script but instead of storing it into a ndjson file it tries to index the logs directly into OpenSearch. However, this can be a very challenging task. Especially with big access log files. Tweaking and tuning OpenSearch for the of millions of lines it was tested with was a challenging task often resulting in overloading the OpenSearch server receiving http 429 to many requests errors.
4. **init.js**: this script needs to run before indexAccessLogs.js if the index has not been created yet.
5. **countLogLines.js**: this script is a convenience script for testing purposes that counts the amount of logs from the S3 bucket so it can be compared to the database or search engine the logs get send to from the previous scripts.

# How to use?
gsutil -m cp *.csv gs://cfalogs/
