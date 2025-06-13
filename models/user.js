'use strict';
const {
  Model
} = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // Mendefinisikan bahwa satu User dapat memiliki banyak Barang.
      this.hasMany(models.Barang, { 
        foreignKey: 'userId' 
      });
    }
  }

  User.init({
    // Kolom disesuaikan dengan skema login Google
    googleId: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    displayName: {
      type: DataTypes.STRING,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'User',
    tableName: 'users', // Eksplisit set nama tabel
    timestamps: false  // Nonaktifkan timestamps
  });

  return User;
};
