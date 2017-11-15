const argv = require('minimist')(process.argv.slice(2));
const Sequelize = require('sequelize');
const csv = require('fast-csv');
const Promise = require('bluebird');
const DataTypes = require('data').DataTypes;

class Importer {
  constructor({ database, host = 'localhost', username = null, password = null, file }) {
    this.database = database;
    this.host = host;
    this.username = username;
    this.password = password;
    this.file = file;

    const requiredArgs = ['database', 'host', 'file'];
    requiredArgs.forEach((arg) => {
      if (!this[arg]) {
        console.log(`You must provide '${arg}'! --${arg}=my_${arg}`);
        process.exit();
      }
    });

    this.sequelize = new Sequelize(this.database, this.username, this.password, {
      dialect: 'postgres',
      host: this.host,
      operatorsAliases: Sequelize.Op,
    });
    this.dataTypes = new DataTypes({ Sequelize });

    // Create a promisified version of our csv parser to improve readability
    this.parseCSV = Promise.method((path, options) => {
      return new Promise((resolve, reject) => {
        const records = [];
        csv.fromPath(path, options)
          .on('data', record => records.push(record))
          .on('end', () => resolve(records));
      });
    });
  }

  setupDatabase() {
    return this.sequelize
      .authenticate()
      .then(() => {
        console.log('Connection has been established successfully.');
        const dataTypes = new DataTypes({ Sequelize });
        return dataTypes.initializeSchema({ sequelize: this.sequelize, force: true });
      })
      .then(() => this.loadData({}))
      .catch(err => {
        console.error('Unable to connect to the database:', err);
      });
  }

  // I've chosen to import each entity one at a time
  // this makes it easy to properly associate each employee with the correct company
  // for large data sets, I would first batch through the data and bulk import the companies
  // then batch through the data a second time and bulk import the employees
  loadData({ filePath = argv.file }) {
    console.log(`Reading from: ${filePath}`);
    const Company = this.sequelize.model('company');
    const Employee = this.sequelize.model('employee');

    return this.parseCSV(filePath)
      .then((data) => {
        const headers = data.shift();
        console.log(`headers: ${JSON.stringify(headers, null, 2)}`);
        const companies = {};

        let createPromise = Promise.resolve();
        data.forEach((datum) => {
          // convert array of values into an object using the headers
          const entry = {};
          datum.forEach((d, index) => {
            entry[headers[index]] = d.trim();
          });

          createPromise = createPromise
            .then(() => {
              const companyName = entry.company_name;
              const company = companies[entry.company_name];
              if (company) return company;
              return {
                name: entry.company_name,
                address1: entry.company_address,
                city: entry.company_city,
                county: entry.company_county,
                state: entry.company_state,
                zip: entry.company_zip,
                phone_number: entry.company_phone1,
                website: entry.company_web,
              };
            })
            .then((company) => {
              if (company.id) return { dataValues: company };
              return Company.create(company);
            })
            .then((result) => {
              const company = result.dataValues;
              if (!companies[company.name]) companies[company.name] = company;
              return company;
            })
            .then((company) => {
              return Employee.create({
                first_name: entry.employee_first_name,
                last_name: entry.employee_last_name,
                phone_number: entry.personal_phone2,
                email: entry.personal_email,
                company_id: company.id,
              });
            });
        });
        return createPromise
          .then(() => {
            console.log(`Created ${Object.keys(companies).length} companies.`);
            console.log(`Created ${data.length} employees.`);
          });
      });
  }
}

console.log(`Importing data using: ${JSON.stringify(argv, null, 2)}`)
const importer = new Importer(argv);
importer.setupDatabase()
  .then(() => {
    console.log('Complete!');
    process.exit();
  })
  .catch((error) => {
    console.log('ERROR:');
    console.log(error);
  });
