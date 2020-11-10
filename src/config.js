module.exports = {
  PORT: process.env.PORT || 8000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN || 'http://localhost:3000',
  JWT_SECRET: process.env.JWT_SECRET || 'change-this-secret',
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://movingday@localhost/moving-day',
  TEST_DATABASE_URL: process.env.TEST_DATABASE_URL || 'postgresql://movingday@localhost/moving-day-test'

}