import pino from "pino";

const isProduction = process.env.NODE_ENV === "production";

const logger = pino({
  level: isProduction ? "info" : "debug",
  transport:
    !isProduction && process.env.NODE_ENV !== "test"
      ? {
          target: "pino-pretty",
          options: {
            colorize: true,
            singleLine: false,
            translateTime: "SYS:standard",
          },
        }
      : undefined,
  timestamp: pino.stdTimeFunctions.isoTime,
});

export default logger;
