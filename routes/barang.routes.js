// routes/barang.routes.js

const express = require('express');
const router = express.Router();

// Asumsikan controller dan middleware diimpor dari lokasi yang sesuai
const barangController = require('../controllers/barangController'); 
const { verifyToken } = require('../middleware/authJwt');
const upload = require('../middleware/upload'); // Asumsikan ada middleware untuk upload

// Rute-rute ini akan dipasang di bawah '/api/barang' di file utama Anda

// Mendapatkan semua barang
router.get('/', [verifyToken], barangController.getAllBarang);

// Mendapatkan barang spesifik berdasarkan ID
router.get('/:id', [verifyToken], barangController.getBarangById);

// Membuat barang baru (membutuhkan token dan upload gambar)
router.post('/', [verifyToken, upload.single('gambar')], barangController.createBarang);

// Mengupdate barang berdasarkan ID (membutuhkan token dan upload gambar)
router.put('/:id', [verifyToken, upload.single('gambar')], barangController.updateBarang);

// Menghapus barang berdasarkan ID (membutuhkan token)
router.delete('/:id', [verifyToken], barangController.deleteBarang);

module.exports = router;
