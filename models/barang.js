'use strict';
const {
  Model
} = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Barang extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // Mendefinisikan bahwa setiap Barang milik satu User.
      this.belongsTo(models.User, { 
        foreignKey: 'userId' 
      });
    }
  }

  Barang.init({
    // Nama kolom disesuaikan dengan migrasi dan index.js
    nama_barang: {
      type: DataTypes.STRING,
      allowNull: false
    },
    deskripsi_barang: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    gambar: {
      type: DataTypes.STRING,
      allowNull: true
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false
    }
  }, {
    sequelize,
    modelName: 'Barang',
    tableName: 'barang', // Eksplisit set nama tabel
    timestamps: false  // Nonaktifkan timestamps (createdAt, updatedAt)
  });

  return Barang;
};
