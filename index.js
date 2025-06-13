// index.js (Refactored to use Sequelize)

// 1. Import semua library yang dibutuhkan
require('dotenv').config();
const express = require('express');
const { Sequelize, DataTypes } = require('sequelize'); // Import Sequelize
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const session = require('express-session');
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const config = require('./config/config.js'); // Import file konfigurasi

// 2. Inisialisasi Aplikasi Express
const app = express();
const PORT = process.env.PORT || 3000;

// 3. Konfigurasi Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
}));

app.use(passport.initialize());
app.use(passport.session());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 4. Konfigurasi dan Koneksi Database dengan Sequelize
// Menentukan lingkungan (development atau production)
const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env];
let sequelize;

// Inisialisasi Sequelize berdasarkan konfigurasi
if (dbConfig.use_env_variable) {
    // Untuk lingkungan production di Railway yang menggunakan DATABASE_URL
    sequelize = new Sequelize(process.env[dbConfig.use_env_variable], dbConfig);
} else {
    // Untuk lingkungan development (lokal)
    sequelize = new Sequelize(dbConfig.database, dbConfig.username, dbConfig.password, dbConfig);
}

// 5. Definisi Model (Struktur Tabel)
// Model untuk tabel 'users'
const User = sequelize.define('User', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    googleId: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    displayName: {
        type: DataTypes.STRING
    }
}, {
    tableName: 'users', // Eksplisit menentukan nama tabel
    timestamps: false // Nonaktifkan timestamps (createdAt, updatedAt) jika tidak perlu
});

// Model untuk tabel 'barang'
const Barang = sequelize.define('Barang', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    nama_barang: {
        type: DataTypes.STRING,
        allowNull: false
    },
    deskripsi_barang: {
        type: DataTypes.TEXT
    },
    gambar: {
        type: DataTypes.STRING
    }
}, {
    tableName: 'barang', // Eksplisit menentukan nama tabel
    timestamps: false // Nonaktifkan timestamps
});

// Fungsi untuk menghubungkan database dan sinkronisasi model
async function connectDatabase() {
    try {
        await sequelize.authenticate();
        console.log('🎉 Koneksi ke database berhasil (Sequelize).');
        // Sinkronisasi model dengan database (membuat tabel jika belum ada)
        await sequelize.sync({ force: false }); // force: false agar tidak menghapus data yang ada
        console.log('Tabel users dan barang siap digunakan.');
    } catch (error) {
        console.error('Gagal terhubung atau sinkronisasi database:', error);
        process.exit(1);
    }
}

// 6. Konfigurasi Passport.js dengan Logika Sequelize
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.CALLBACK_URL
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      // Cek apakah user sudah ada menggunakan Sequelize
      const [user, created] = await User.findOrCreate({
        where: { googleId: profile.id },
        defaults: {
          displayName: profile.displayName
        }
      });
      // 'user' adalah objek user yang ditemukan atau baru dibuat
      // 'created' adalah boolean (true jika user baru dibuat)
      return done(null, user);
    } catch (error) {
      return done(error, null);
    }
  }
));

// Serialisasi dan Deserialisasi user untuk session
passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
      // Cari user berdasarkan Primary Key (id) menggunakan Sequelize
      const user = await User.findByPk(id);
      done(null, user);
    } catch (error) {
      done(error, null);
    }
});

// 7. Middleware untuk Cek Login (Tidak ada perubahan)
function isLoggedIn(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.status(401).json({ message: 'Akses ditolak. Silakan login terlebih dahulu.' });
}

// 8. Konfigurasi Multer (Tidak ada perubahan)
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });


// === ROUTES ===

// 9. Rute Otentikasi (Tidak ada perubahan signifikan)
app.get('/', (req, res) => {
    res.json({ message: 'Selamat datang di API Inventaris. Silakan login menggunakan /auth/google' });
});

app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

app.get('/auth/google/callback', 
  passport.authenticate('google', { failureRedirect: '/' }),
  (req, res) => {
    res.redirect('/profile');
  });

app.get('/profile', isLoggedIn, (req, res) => {
    // req.user sekarang adalah objek Sequelize
    res.json({ message: `Halo, ${req.user.displayName}`, user: req.user });
});

app.get('/logout', (req, res, next) => {
    req.logout(function(err) {
        if (err) { return next(err); }
        res.json({ message: 'Anda berhasil logout.' });
    });
});

// 10. Rute API CRUD untuk Barang (diubah menggunakan Sequelize)

// GET semua barang
app.get('/api/barang', isLoggedIn, async (req, res) => {
    try {
        const barangs = await Barang.findAll();
        res.json(barangs);
    } catch (error) {
        res.status(500).json({ message: 'Error mengambil data barang', error: error.message });
    }
});

// GET barang by ID
app.get('/api/barang/:id', isLoggedIn, async (req, res) => {
    try {
        const barang = await Barang.findByPk(req.params.id);
        if (!barang) {
            return res.status(404).json({ message: 'Barang tidak ditemukan' });
        }
        res.json(barang);
    } catch (error) {
        res.status(500).json({ message: 'Error mengambil data barang', error: error.message });
    }
});

// POST barang baru
app.post('/api/barang', isLoggedIn, upload.single('gambar'), async (req, res) => {
    const { nama_barang, deskripsi_barang } = req.body;
    if (!nama_barang || !req.file) {
        return res.status(400).json({ message: 'Nama barang dan gambar wajib diisi.' });
    }
    const gambarUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    
    try {
        const newBarang = await Barang.create({
            nama_barang,
            deskripsi_barang,
            gambar: gambarUrl
        });
        res.status(201).json(newBarang);
    } catch (error) {
        res.status(500).json({ message: 'Error menyimpan data barang', error: error.message });
    }
});

// PUT (update) barang
app.put('/api/barang/:id', isLoggedIn, upload.single('gambar'), async (req, res) => {
    const { id } = req.params;
    const { nama_barang, deskripsi_barang } = req.body;
    
    try {
        const barangToUpdate = await Barang.findByPk(id);
        if (!barangToUpdate) {
            return res.status(404).json({ message: 'Barang tidak ditemukan' });
        }

        // Siapkan data untuk diupdate
        const updateData = {
            nama_barang: nama_barang || barangToUpdate.nama_barang,
            deskripsi_barang: deskripsi_barang || barangToUpdate.deskripsi_barang
        };

        if (req.file) {
            updateData.gambar = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
        }
        
        await barangToUpdate.update(updateData);
        res.json({ message: 'Barang berhasil diupdate.', data: barangToUpdate });
    } catch (error) {
        res.status(500).json({ message: 'Error mengupdate data barang', error: error.message });
    }
});

// DELETE barang
app.delete('/api/barang/:id', isLoggedIn, async (req, res) => {
    try {
        const result = await Barang.destroy({
            where: { id: req.params.id }
        });
        if (result === 0) {
            return res.status(404).json({ message: 'Barang tidak ditemukan' });
        }
        res.status(200).json({ message: 'Barang berhasil dihapus' });
    } catch (error) {
        res.status(500).json({ message: 'Error menghapus data barang', error: error.message });
    }
});


// 11. Jalankan server setelah koneksi database berhasil
connectDatabase().then(() => {
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`🚀 Server berjalan di port ${PORT}`);
    });
});
