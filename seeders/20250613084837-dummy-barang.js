'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Menggunakan nama tabel 'barang'
    await queryInterface.bulkInsert('barang', [
      {
        nama_barang: 'Laptop Pro 14 inch',
        deskripsi_barang: 'Laptop bertenaga tinggi dengan prosesor terbaru, cocok untuk profesional dan kreator konten.',
        gambar: 'https://placehold.co/600x400/EEE/31343C?text=Laptop+Pro',
        userId: null, // Data seeder bisa tidak dimiliki user manapun
      },
      {
        nama_barang: 'Keyboard Mekanikal RGB',
        deskripsi_barang: 'Keyboard dengan switch biru yang responsif dan lampu RGB yang bisa dikustomisasi.',
        gambar: 'https://placehold.co/600x400/31343C/EEE?text=Keyboard+RGB',
        userId: null,
      },
      {
        nama_barang: 'Mouse Gaming Wireless',
        deskripsi_barang: 'Mouse ringan dengan sensor presisi tinggi dan konektivitas wireless tanpa jeda.',
        gambar: 'https://placehold.co/600x400/5A67D8/FFFFFF?text=Mouse+Gaming',
        userId: null,
      }
    ], {});
  },

  down: async (queryInterface, Sequelize) => {
    // Menghapus semua data dari tabel 'barang'
    await queryInterface.bulkDelete('barang', null, {});
  }
};
