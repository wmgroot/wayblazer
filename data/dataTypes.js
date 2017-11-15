class DataTypes {
  constructor({ Sequelize }) {
    this.Sequelize = Sequelize;
    this.models = {};
  }

  // force: true will drop the table if it already exists
  initializeSchema({ sequelize, force = false }) {
    const types = this.types();
    Object.keys(types).forEach((type) => {
      this.models[type] = sequelize.define(type, types[type], { underscored: true });
    });

    const syncList = new Set();
    const relationships = this.relationships();
    Object.keys(relationships).forEach((owner) => {
      syncList.add(owner);
      relationships[owner].forEach((ownee) => {
        this.models[ownee].belongsTo(this.models[owner]);
        this.models[owner].hasMany(this.models[ownee]);
        syncList.add(ownee);
      });
    });

    let syncPromise = Promise.resolve();
    syncList.forEach((type) => {
      syncPromise = syncPromise
        .then(() => this.models[type].sync({ force }));
    });
    return syncPromise
      .then(() => this.models);
  }

  relationships() {
    return {
      company: ['employee'],  // employee belongs to company
    };
  }

  types() {
    return {
      company: {
        name: { type: this.Sequelize.STRING },
        address1: { type: this.Sequelize.STRING },
        city: { type: this.Sequelize.STRING },
        county: { type: this.Sequelize.STRING },
        state: { type: this.Sequelize.STRING },
        zip: { type: this.Sequelize.STRING },
        phone_number: { type: this.Sequelize.STRING },
        website: { type: this.Sequelize.STRING },
      },
      employee: {
        first_name: { type: this.Sequelize.STRING },
        last_name: { type: this.Sequelize.STRING },
        phone_number: { type: this.Sequelize.STRING },
        email: { type: this.Sequelize.STRING },
      },
    };
  }
}
module.exports.DataTypes = DataTypes;
