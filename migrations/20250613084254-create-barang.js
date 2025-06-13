// Migrasi untuk membuat tabel 'barang'

'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('barang', { // Nama tabel adalah 'barang'
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      nama_barang: {
        type: Sequelize.STRING,
        allowNull: false
      },
      deskripsi_barang: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      gambar: {
        type: Sequelize.STRING,
        allowNull: true
      },
      userId: { // Kunci asing (Foreign Key) untuk relasi
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users', // Merujuk ke tabel 'users'
          key: 'id'       // Merujuk ke kolom 'id' di tabel 'users'
        },
        onUpdate: 'CASCADE', // Jika id user berubah, update di sini juga
        onDelete: 'CASCADE'  // Jika user dihapus, barang miliknya juga terhapus
      }
      // Kolom createdAt dan updatedAt dihapus karena timestamps: false di model
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('barang');
  }
};