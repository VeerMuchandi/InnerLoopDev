module.exports = (sequelize, Sequelize) => {
    const Item = sequelize.define("item", {
      id: {
            type: Sequelize.BIGINT,
            autoIncrement: true,
            primaryKey: true
        },
      itemName: {
        type: Sequelize.STRING
      },
      itemPrice: {
        type: Sequelize.DECIMAL(10,2)
      }
    }, {underscored: true, timestamps: false, tableName: "item"});
    return Item;
  };