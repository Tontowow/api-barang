// File 1: xxxx-create-user.js
// Migrasi untuk membuat tabel 'users'

'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('users', { // Nama tabel disesuaikan menjadi 'users' (lowercase)
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      googleId: { // Diubah dari email/password
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      displayName: { // Diubah dari email/password
        type: Sequelize.STRING,
        allowNull: true
      }
      // Kolom createdAt dan updatedAt dihapus karena timestamps: false di model
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('users');
  }
};