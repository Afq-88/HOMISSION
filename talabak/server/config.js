'use strict';
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = process.env.DATA_DIR || path.join(ROOT, 'data');
module.exports = {
  ROOT,
  PUBLIC_DIR: path.join(ROOT, 'public'),
  PORT: process.env.PORT === undefined ? 3000 : +process.env.PORT,
  HOST: process.env.HOST || '0.0.0.0',
  DATA_DIR,
  DB_PATH: process.env.DB_PATH || path.join(DATA_DIR, 'talabak.db'),
  BACKUP_DIR: process.env.BACKUP_DIR || path.join(DATA_DIR, 'backups'),
  // خلف وسيط HTTPS (Render / Railway / Nginx ...) اجعلها 1
  TRUST_PROXY: process.env.TRUST_PROXY === '1',
  COOKIE_SECURE: process.env.COOKIE_SECURE === '1',
  BACKUP_EVERY_HOURS: process.env.BACKUP_EVERY_HOURS === undefined ? 6 : +process.env.BACKUP_EVERY_HOURS,
  BACKUP_KEEP: +process.env.BACKUP_KEEP || 40,
  TZ_OFFSET_HOURS: 3, // توقيت الكويت UTC+3 بلا توقيت صيفي
  SESSION_HOURS: 12,
};
