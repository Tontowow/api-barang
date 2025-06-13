// middleware/upload.js
const multer = require('multer');
const path = require('path');

// Konfigurasi penyimpanan untuk multer
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/'); // Folder tempat menyimpan file
    },
    filename: function (req, file, cb) {
        // Membuat nama file yang unik untuk menghindari konflik
        cb(null, 'film-' + Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

module.exports = upload;