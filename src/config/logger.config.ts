import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';

const { combine, timestamp, printf, colorize, errors, json } = winston.format;

const devFormat = combine(
  colorize({ all: true }),
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  errors({ stack: true }),
  printf((info) => {
    const { level, message, timestamp, context, stack } = info;

    const ctx = context ? ` [${String(context)}]` : '';
    const err = stack ? `\n${String(stack)}` : '';

    return `${timestamp} ${level}${ctx}: ${message}${err}`;
  }),
);

const prodFormat = combine(timestamp(), errors({ stack: true }), json());

export const createWinstonLogger = (nodeEnv: string = 'development') =>
  WinstonModule.createLogger({
    transports: [
      new winston.transports.Console({
        format: nodeEnv === 'production' ? prodFormat : devFormat,
        silent: nodeEnv === 'test',
      }),
      ...(nodeEnv === 'production'
        ? [
            new winston.transports.File({
              filename: 'logs/error.log',
              level: 'error',
              format: prodFormat,
            }),
            new winston.transports.File({
              filename: 'logs/combined.log',
              format: prodFormat,
            }),
          ]
        : []),
    ],
  });
