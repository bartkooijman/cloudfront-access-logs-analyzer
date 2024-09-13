import winston from "winston";
import config from "../config/config.js";

let loggerConfig = {
  level: "info",
  exitOnError: true,
  format: winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp(),
    winston.format.align(),
    winston.format.errors({ stack: true }),
    winston.format.printf(
      (info) => `${info.timestamp} ${info.level}: ${info.message}`
    )
  ),
  transports: [],
};

if (config.logger.logToConsole) {
  loggerConfig.transports.push(new winston.transports.Console());
} else {
  loggerConfig.transports.push(
    new winston.transports.File({ filename: `./logs/${config.logger.logFilePrefix}-combined.log`, level: "debug", options: { flags: "w" } })
  );
  loggerConfig.transports.push(
    new winston.transports.File({ filename: `./logs/${config.logger.logFilePrefix}-warnings.log`, level: "warn", options: { flags: "w" } })
  );
}

const logger = winston.createLogger(loggerConfig);

logger.debug("Logger initialized");

export { logger };
