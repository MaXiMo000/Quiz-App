import winston from 'winston';
import 'winston-daily-rotate-file';

const { combine, timestamp, printf, colorize, json } = winston.format;

// Custom format for log messages
const myFormat = printf(({ level, message, timestamp, stack }) => {
  return `${timestamp} ${level}: ${stack || message}`;
});

const transports = [
    new winston.transports.Console({
        level: process.env.LOG_LEVEL || 'info',
        silent: process.env.NODE_ENV === 'test' && process.env.LOG_LEVEL !== 'debug',
        format: combine(
            colorize(),
            timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
            myFormat
        )
    })
];

// In non-test environments, add file logging
if (process.env.NODE_ENV !== 'test') {
    transports.push(
        new winston.transports.DailyRotateFile({
            filename: 'logs/application-%DATE%.log',
            datePattern: 'YYYY-MM-DD',
            zippedArchive: true,
            maxSize: '20m',
            maxFiles: '14d',
            level: 'info',
            format: combine(
                timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
                json()
            )
        })
    );
    transports.push(
        new winston.transports.DailyRotateFile({
            filename: 'logs/error-%DATE%.log',
            datePattern: 'YYYY-MM-DD',
            zippedArchive: true,
            maxSize: '20m',
            maxFiles: '14d',
            level: 'error',
            format: combine(
                winston.format.errors({ stack: true }),
                timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
                json()
            )
        })
    );
}


const logger = winston.createLogger({
  transports,
  exitOnError: false, // Do not exit on handled exceptions
});

// Stream for morgan (if used)
logger.stream = {
    write: function(message) {
        logger.info(message.trim());
    },
};

export default logger;
