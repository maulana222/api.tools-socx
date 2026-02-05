module.exports = (sequelize, DataTypes) => {
  const IsimpleProduct = sequelize.define('IsimpleProduct', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'name'
    },
    price: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'price'
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'created_at'
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'updated_at'
    }
  }, {
    tableName: 'isimple_products',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        name: 'idx_name',
        fields: ['name']
      },
      {
        name: 'idx_price',
        fields: ['price']
      }
    ]
  });

  return IsimpleProduct;
};