import pino from 'pino';
import config from './config';

const logger = pino({
  level: config.NODE_ENV === 'production' ? 'info' : 'debug',
  ...(config.NODE_ENV !== 'production' && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss',
        ignore: 'pid,hostname',
      },
    },
  }),
  base: { service: 'codementor-api', env: config.NODE_ENV },
  serializers: {
    err: pino.stdSerializers.err,
    req: (req: any) => ({ method: req.method, url: req.url, id: req.id }),
  },
});

export default logger;
