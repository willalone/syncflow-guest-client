import dotenv from 'dotenv';

dotenv.config();

export const env = {
  port: Number(process.env.PORT || 3000),
  clientOrigin: process.env.CLIENT_ORIGIN || '*',
  jwtSecret: process.env.JWT_SECRET || 'replace_me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  db: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'syncflow_restaurant',
  },
};
