// index.js (Final Version: Sequelize, Controller, JWT, Production-Ready)

// 1. Import semua library yang dibutuhkan
require('dotenv').config();
const express = require('express');
const { Sequelize, DataTypes } = require('sequelize');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const config = require('./config/config.js'); // Menggunakan file konfigurasi
const { verifyToken } = require('./middleware/auth.middleware.js');

// 2. Inisialisasi Aplikasi Express
const app = express();
const PORT = process.env.PORT || 3000;

// 3. Konfigurasi Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(passport.initialize());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 4. Konfigurasi Database dengan Sequelize (Production-Ready)
const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env];
let sequelize;

// Logika ini secara otomatis memilih konfigurasi yang tepat
if (dbConfig.use_env_variable) {
    // Untuk lingkungan PRODUCTION (seperti di Railway)
    sequelize = new Sequelize(process.env[dbConfig.use_env_variable], dbConfig);
} else {
    // Untuk lingkungan DEVELOPMENT (lokal)
    sequelize = new Sequelize(dbConfig.database, dbConfig.username, dbConfig.password, dbConfig);
}

// 5. Impor dan Inisialisasi Model, Controller, dan Rute
const db = {};

// Membaca semua file model dari folder /models secara dinamis
require('fs').readdirSync(path.join(__dirname, 'models')).forEach(file => {
  if(file.slice(-3) === '.js') {
    const model = require(path.join(__dirname, 'models', file))(sequelize, DataTypes);
    db[model.name] = model;
  }
});

// Membuat asosiasi antar model jika ada
Object.values(db).forEach(model => {
  if (model.associate) {
    model.associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

// Inisialisasi Controller dengan object db yang sudah lengkap
const barangController = require('./controllers/barangController')(db);

// Menyiapkan rute-rute
const barangRoutes = require('./routes/barang.routes')(barangController);


async function connectDatabase() {
    try {
        await sequelize.authenticate();
        console.log('🎉 Koneksi ke database berhasil (Sequelize).');
        // Di produksi, kita andalkan migrasi, bukan sync()
        // await sequelize.sync({ alter: true }); // Hati-hati menggunakan ini di produksi
    } catch (error) {
        console.error('Gagal terhubung ke database:', error);
        process.exit(1);
    }
}

// 6. Konfigurasi Passport.js (tanpa session)
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.CALLBACK_URL
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      const [user] = await db.User.findOrCreate({
        where: { googleId: profile.id },
        defaults: { displayName: profile.displayName }
      });
      return done(null, user);
    } catch (error) {
      return done(error, null);
    }
  }
));

// 7. Konfigurasi Multer
const storage = multer.diskStorage({ destination: (req, file, cb) => cb(null, 'uploads/'), filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname)) });
const upload = multer({ storage: storage });

// === ROUTES ===

// 8. Rute Otentikasi (JWT)
app.get('/', (req, res) => res.json({ message: 'Selamat datang di API Inventaris' }));
app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'], session: false }));
app.get('/auth/google/callback', 
  passport.authenticate('google', { failureRedirect: '/', session: false }),
  (req, res) => {
    const token = jwt.sign({ id: req.user.id }, process.env.JWT_SECRET, { expiresIn: 86400 });
    res.json({
        message: 'Otentikasi berhasil!',
        accessToken: token,
        user: { id: req.user.id, displayName: req.user.displayName }
    });
  }
);

// Rute Profile (dilindungi JWT)
app.get('/profile', verifyToken, async (req, res) => {
    try {
        const user = await db.User.findByPk(req.userId, { attributes: ['id', 'displayName']});
        if (!user) return res.status(404).json({ message: "User tidak ditemukan." });
        res.json({ message: `Halo, ${user.displayName}`, user });
    } catch (error) {
        res.status(500).json({ message: "Gagal mengambil data profile."})
    }
});

// 9. Rute API untuk Barang
// Rute barang sekarang menggunakan middleware upload
app.use('/api/barang', (req, res, next) => {
    req.upload = upload;
    next();
}, barangRoutes);


// 10. Jalankan server setelah koneksi database berhasil
connectDatabase().then(() => {
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`🚀 Server berjalan di port ${PORT}`);
    });
});
