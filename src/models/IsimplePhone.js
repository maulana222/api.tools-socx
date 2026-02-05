module.exports = (sequelize, DataTypes) => {
  const IsimplePhone = sequelize.define('IsimplePhone', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    phone_number: {
      type: DataTypes.STRING(20),
      allowNull: false,
      unique: true,
      field: 'phone_number'
    },
    last_check_status: {
      type: DataTypes.STRING(20),
      allowNull: true,
      field: 'last_check_status'
    },
    last_check_response: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'last_check_response'
    },
    last_check_at: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'last_check_at'
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
    tableName: 'isimple_phones',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        name: 'idx_phone_number',
        fields: ['phone_number']
      },
      {
        name: 'idx_last_check_at',
        fields: ['last_check_at']
      }
    ]
  });

  return IsimplePhone;
};