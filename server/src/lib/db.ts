import 'dotenv/config';
import mysql from 'mysql2/promise';
import { env } from './env.js';

const { HTTP_PORT = 3000, DB_HOST, DB_USER, DB_PASSWORD, DB_DATABASE } = env;

export const dbPool = mysql.createPool({
  host: DB_HOST,
  user: DB_USER,
  password: DB_PASSWORD,
  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
});
