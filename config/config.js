// config/config.js

// Baris ini sekarang akan berfungsi karena ini adalah file .js
require('dotenv').config(); 

module.exports = {
  // Konfigurasi untuk lingkungan development (lokal)
  development: {
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    dialect: "mysql"
  },
  // Konfigurasi untuk lingkungan testing (jika diperlukan)
  test: {
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    dialect: "mysql"
  },
  // Konfigurasi untuk lingkungan production (di Railway)
  production: {
    // Railway menyediakan variabel DATABASE_URL secara otomatis.
    // Opsi ini memberitahu Sequelize untuk menggunakan URL koneksi tersebut.
    use_env_variable: "DATABASE_URL", 
    dialect: "mysql",
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false // Diperlukan untuk beberapa koneksi database cloud
      }
    }
  }
};