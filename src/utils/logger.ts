export const logger = {
  info: (message: string, context?: Record<string, any>) => {
    if (import.meta.env.MODE !== 'production') {
      console.info(`[INFO] ${message}`, context || '');
    } else {
      console.info(JSON.stringify({ level: 'INFO', message, context }));
    }
  },
  error: (message: string, error?: unknown, context?: Record<string, any>) => {
    const errorDetails = error instanceof Error ? { message: error.message, stack: error.stack } : error;
    if (import.meta.env.MODE !== 'production') {
      console.error(`[ERROR] ${message}`, errorDetails, context || '');
    } else {
      console.error(JSON.stringify({ level: 'ERROR', message, error: errorDetails, context }));
    }
  },
  warn: (message: string, context?: Record<string, any>) => {
    if (import.meta.env.MODE !== 'production') {
      console.warn(`[WARN] ${message}`, context || '');
    } else {
      console.warn(JSON.stringify({ level: 'WARN', message, context }));
    }
  }
};
