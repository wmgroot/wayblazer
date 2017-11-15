const argv = require('minimist')(process.argv.slice(2));
const http = require('http');
const Sequelize = require('sequelize');
const DataTypes = require('data').DataTypes;
const API = require('./api.js').API;

console.log('seq:')
console.log(Sequelize.col('company.id'))

if (!argv.host) argv.host = 'localhost';
if (!argv.port) argv.port = '8000';
argv.port = parseInt(argv.port, 10);

console.log(`API server starting: ${JSON.stringify(argv, null, 2)}`)

const requiredArgs = ['database', 'host'];
requiredArgs.forEach((arg) => {
  if (!(arg in argv)) {
    console.log(`You must provide '${arg}'! --${arg}=my_${arg}`);
    process.exit();
  }
});

const sequelize = this.sequelize = new Sequelize(argv.database, argv.username, argv.password, {
  dialect: 'postgres',
  host: argv.host,
  operatorsAliases: Sequelize.Op,
});

const dataTypes = new DataTypes({ Sequelize });
dataTypes.initializeSchema({ sequelize })
  .then((models) => {
    const api = new API({ dataTypes, models, sequelize });
    api.app.set('port', argv.port);

    const server = http.createServer(api.app);
    server.listen(argv.port);
    console.log(`Server listening at: http://localhost:${argv.port}`);
  });
