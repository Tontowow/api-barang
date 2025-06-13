// index.js

// 1. Import semua library yang dibutuhkan
require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const session = require('express-session');
const multer = require('multer');
const path = require('path');
const cors = require('cors');

// 2. Inisialisasi Aplikasi Express
const app = express();
const PORT = process.env.PORT || 3000;

// 3. Konfigurasi Middleware
app.use(cors()); // Mengizinkan request dari domain lain
app.use(express.json()); // Mem-parse body JSON
app.use(express.urlencoded({ extended: true })); // Mem-parse body URL-encoded

// Konfigurasi session
app.use(session({
    secret: process.env.SESSION_SECRET, // Kunci rahasia untuk session
    resave: false,
    saveUninitialized: true,
}));

// Inisialisasi Passport
app.use(passport.initialize());
app.use(passport.session());

// Membuat folder 'uploads' bisa diakses secara publik
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 4. Konfigurasi Database MySQL
let db;
async function connectDatabase() {
    try {
        db = await mysql.createPool({
            host: process.env.MYSQLHOST,
            user: process.env.MYSQLUSER,
            password: process.env.MYSQLPASSWORD,
            database: process.env.MYSQLDATABASE,
            port: process.env.MYSQLPORT,
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0
        });
        console.log('🎉 Terhubung ke database MySQL di Railway!');

        // 5. Membuat tabel jika belum ada
        await db.execute(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                googleId VARCHAR(255) NOT NULL UNIQUE,
                displayName VARCHAR(255)
            );
        `);

        await db.execute(`
            CREATE TABLE IF NOT EXISTS barang (
                id INT AUTO_INCREMENT PRIMARY KEY,
                nama_barang VARCHAR(255) NOT NULL,
                deskripsi_barang TEXT,
                gambar VARCHAR(255)
            );
        `);
        console.log('Tabel users dan barang siap digunakan.');
    } catch (error) {
        console.error('Gagal terhubung atau membuat tabel:', error);
        process.exit(1); // Keluar dari aplikasi jika database gagal terhubung
    }
}

// 6. Konfigurasi Passport.js dengan Google Strategy
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.CALLBACK_URL
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
        // Cek apakah user sudah ada di database
        const [rows] = await db.execute('SELECT * FROM users WHERE googleId = ?', [profile.id]);
        if (rows.length > 0) {
            // User sudah ada
            return done(null, rows[0]);
        } else {
            // User belum ada, buat user baru
            const [result] = await db.execute('INSERT INTO users (googleId, displayName) VALUES (?, ?)', [profile.id, profile.displayName]);
            const [newUser] = await db.execute('SELECT * FROM users WHERE id = ?', [result.insertId]);
            return done(null, newUser[0]);
        }
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
        const [rows] = await db.execute('SELECT * FROM users WHERE id = ?', [id]);
        done(null, rows[0]);
    } catch (error) {
        done(error, null);
    }
});

// 7. Middleware untuk Cek Login
function isLoggedIn(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.status(401).json({ message: 'Akses ditolak. Silakan login terlebih dahulu.' });
}

// 8. Konfigurasi Multer untuk Upload Gambar
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/'); // Folder penyimpanan gambar
    },
    filename: function (req, file, cb) {
        // Membuat nama file unik: timestamp + nama asli
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// === ROUTES ===

// 9. Rute Otentikasi
app.get('/', (req, res) => {
    res.json({ message: 'Selamat datang di API Inventaris. Silakan login menggunakan /auth/google' });
});

app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] }));

app.get('/auth/google/callback', 
  passport.authenticate('google', { failureRedirect: '/' }),
  (req, res) => {
    // Redirect berhasil, bisa ke halaman depan atau kirim JSON
    res.redirect('/profile');
  });

app.get('/profile', isLoggedIn, (req, res) => {
    res.json({ message: `Halo, ${req.user.displayName}`, user: req.user });
});

app.get('/logout', (req, res, next) => {
    req.logout(function(err) {
        if (err) { return next(err); }
        res.json({ message: 'Anda berhasil logout.' });
    });
});

// 10. Rute API CRUD untuk Barang (dilindungi)
// GET semua barang
app.get('/api/barang', isLoggedIn, async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM barang');
        res.json(rows);
    } catch (error) {
        res.status(500).json({ message: 'Error mengambil data barang', error: error.message });
    }
});

// GET barang by ID
app.get('/api/barang/:id', isLoggedIn, async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM barang WHERE id = ?', [req.params.id]);
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Barang tidak ditemukan' });
        }
        res.json(rows[0]);
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
    // URL gambar yang akan disimpan di database
    const gambarUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    
    try {
        const [result] = await db.execute(
            'INSERT INTO barang (nama_barang, deskripsi_barang, gambar) VALUES (?, ?, ?)',
            [nama_barang, deskripsi_barang, gambarUrl]
        );
        res.status(201).json({ id: result.insertId, nama_barang, deskripsi_barang, gambar: gambarUrl });
    } catch (error) {
        res.status(500).json({ message: 'Error menyimpan data barang', error: error.message });
    }
});

// PUT (update) barang
app.put('/api/barang/:id', isLoggedIn, upload.single('gambar'), async (req, res) => {
    const { id } = req.params;
    const { nama_barang, deskripsi_barang } = req.body;

    let gambarUrl;
    if(req.file) {
        gambarUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    }

    try {
        // Query dinamis tergantung apakah gambar diupdate atau tidak
        let query;
        let params;
        if (gambarUrl) {
            query = 'UPDATE barang SET nama_barang = ?, deskripsi_barang = ?, gambar = ? WHERE id = ?';
            params = [nama_barang, deskripsi_barang, gambarUrl, id];
        } else {
            query = 'UPDATE barang SET nama_barang = ?, deskripsi_barang = ? WHERE id = ?';
            params = [nama_barang, deskripsi_barang, id];
        }

        const [result] = await db.execute(query, params);
        if(result.affectedRows === 0) {
            return res.status(404).json({ message: 'Barang tidak ditemukan' });
        }
        res.json({ message: 'Barang berhasil diupdate.' });
    } catch (error) {
        res.status(500).json({ message: 'Error mengupdate data barang', error: error.message });
    }
});

// DELETE barang
app.delete('/api/barang/:id', isLoggedIn, async (req, res) => {
    try {
        const [result] = await db.execute('DELETE FROM barang WHERE id = ?', [req.params.id]);
        if (result.affectedRows === 0) {
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