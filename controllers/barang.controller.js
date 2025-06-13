// controllers/barangController.js

const fs = require('fs');
const path = require('path');

// Ekspor sebuah fungsi yang menerima object 'db' berisi model-model database
module.exports = (db) => {
    // Ambil model Barang dan User dari object db
    const { Barang, User } = db;

    return {
        // Fungsi untuk mendapatkan semua barang
        getAllBarang: async (req, res) => {
            try {
                // Mengambil semua data barang, diurutkan dari yang terbaru
                const barangs = await Barang.findAll({
                    order: [['id', 'DESC']] 
                });
                res.json(barangs);
            } catch (error) {
                res.status(500).json({ message: 'Error mengambil data barang', error: error.message });
            }
        },

        // Fungsi untuk mendapatkan barang berdasarkan ID
        getBarangById: async (req, res) => {
            try {
                const barang = await Barang.findByPk(req.params.id);
                if (!barang) {
                    return res.status(404).json({ message: 'Barang tidak ditemukan' });
                }
                res.json(barang);
            } catch (error) {
                res.status(500).json({ message: 'Error mengambil data barang', error: error.message });
            }
        },

        // Fungsi untuk membuat barang baru
        createBarang: async (req, res) => {
            const { nama_barang, deskripsi_barang } = req.body;
            if (!nama_barang || !req.file) {
                return res.status(400).json({ message: 'Nama barang dan gambar wajib diisi.' });
            }
            // URL gambar yang akan disimpan di database
            const gambarUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
            
            try {
                // Membuat data barang baru dan menyertakan ID user yang sedang login
                const newBarang = await Barang.create({
                    nama_barang,
                    deskripsi_barang,
                    gambar: gambarUrl,
                    userId: req.user.id // Menyimpan ID user yang membuat
                });
                res.status(201).json(newBarang);
            } catch (error) {
                res.status(500).json({ message: 'Error menyimpan data barang', error: error.message });
            }
        },

        // Fungsi untuk mengupdate barang
        updateBarang: async (req, res) => {
            try {
                const barang = await Barang.findByPk(req.params.id);
                if (!barang) {
                    return res.status(404).send({ message: "Barang tidak ditemukan" });
                }

                // Cek apakah user yang login adalah pemilik barang
                if (barang.userId !== req.user.id) {
                    return res.status(403).send({ message: "Akses ditolak: Anda bukan pemilik barang ini." });
                }
                
                const { nama_barang, deskripsi_barang } = req.body;
                const updateData = {
                    nama_barang: nama_barang || barang.nama_barang,
                    deskripsi_barang: deskripsi_barang || barang.deskripsi_barang,
                };

                // Jika ada file gambar baru yang di-upload
                if (req.file) {
                    // Hapus file gambar lama
                    const oldFilename = barang.gambar.split('/').pop();
                    if (oldFilename) {
                        fs.unlink(path.join(__dirname, '..', 'uploads', oldFilename), (err) => {
                            if (err) console.error("Gagal menghapus file gambar lama:", err);
                        });
                    }
                    // Atur URL gambar baru
                    updateData.gambar = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
                }

                await barang.update(updateData);
                res.json({ message: "Barang berhasil diupdate!", data: barang });

            } catch (error) {
                res.status(500).send({ message: error.message });
            }
        },

        // Fungsi untuk menghapus barang
        deleteBarang: async (req, res) => {
            try {
                const barang = await Barang.findByPk(req.params.id);
                if (!barang) {
                    return res.status(404).send({ message: "Barang tidak ditemukan" });
                }

                // Cek apakah user yang login adalah pemilik barang
                if (barang.userId !== req.user.id) {
                    return res.status(403).send({ message: "Akses ditolak: Anda bukan pemilik barang ini." });
                }

                // Hapus file gambar dari folder 'uploads'
                const filename = barang.gambar.split('/').pop();
                if (filename) {
                    fs.unlink(path.join(__dirname, '..', 'uploads', filename), (err) => {
                        if (err) console.error("Gagal menghapus file gambar:", err);
                    });
                }
                
                await barang.destroy();
                res.send({ message: "Barang berhasil dihapus!" });
            } catch (error) {
                res.status(500).send({ message: error.message });
            }
        }
    };
};
