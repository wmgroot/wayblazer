const express = require('express');
const bodyParser = require('body-parser');

class API {
  constructor({ _bodyParser, _express, _routeInitializer, dataTypes, models, sequelize }) {
    this.sequelize = sequelize;
    this.dataTypes = dataTypes;
    this.models = models;

    this.app = _express ? _express() : express();
    const bp = _bodyParser || bodyParser;
    this.app.use(bp.json());

    const routeInitializer = _routeInitializer || this.initializeRoutes.bind(this);
    routeInitializer();
  }

  initializeRoutes() {
    this.app.get('/resources/:type/_:action', this.route({}));
    this.app.get('/resources/:type', this.route({ func: this.findAll }));

    // duplicate the GET routes with POST
    // this is for clients that can't send a body on a GET request
    this.app.post('/resources/:type/_:action', this.route({}));
    this.app.post('/resources/:type', this.route({ func: this.findAll }));

    // catch-all route that defaults to a 404.
    this.app.use((req, res) => {
       res.sendStatus(404);
    });
  }

  route({ func }) {
    return (req, res) => {
      try {
        let body = Object.assign({}, req.body);
        let { action, type } = req.params;
        const { include } = req.query;

        action = this.parseAction({ action, func }).bind(this);

        this.parseSequelizeStatements(body);
        if (include) body = this.parseInclude({ body, include })

        return action({ body, models: this.models, sequelize: this.sequelize, type })
          .then((results) => res.status(200).send({ total: results.length, results }));
      } catch (error) {
        const message = error.message || 'Internal Server Error.';
        const status = error.status || 500;
        return Promise.resolve()
          .then(() => {
            res.status(status).send({ message, status });
          });
      }
    };
  }

  parseAction({ action, func }) {
    let _action = func;
    if (!_action && action) {
      _action = this[action];
    }
    if (!_action) {
      const error = new Error('Routing Error: could not find an appropriate route.');
      error.status = 400;
      throw error;
    }
    return _action;
  }

  parseInclude({ body, include }) {
    const newBody = Object.assign({}, body);

    const includes = include.split(',');
    if (!newBody.include) newBody.include = [];

    includes.forEach((i, index) => {
      if (!this.models[i]) {
        const error = new Error(`${i} is not a valid model for 'include=${include}'`);
        error.status = 400;
        throw error;
      }

      if (!newBody.include[index]) newBody.include[index] = {};
      newBody.include[index].model = this.models[i];
    });

    return newBody;
  }

  findAll({ body, models, type }) {
    const model = models[type];
    if (!model) {
      const error = new Error(`Type '${type}' does not exist!`);
      error.status = 400;
      throw error;
    }
    return models[type].findAll(body);
  }

  findWithAssociatedCount({ body, type }) {
    this.ensureRequiredParams({ body, required: ['association', 'count', 'table'] });
    const { association, count, table } = body;
    const sql = `
SELECT *
FROM ${table}
INNER JOIN (
  SELECT ${type}_id
  FROM ${association}
  GROUP BY ${type}_id
  HAVING COUNT(${association}.id) = ${count}
) AS ${association} ON ${table}.id = ${association}.${type}_id;`;

    return this.sequelize.query(sql, { type: this.sequelize.QueryTypes.SELECT });
  }

  valueCountForField({ body, sequelize }) {
    this.ensureRequiredParams({ body, required: ['field', 'table'] });
    const { field, minimum = 0, table } = body;
    const sql = `
SELECT ${field}, COUNT(*)
FROM ${table}
GROUP BY ${field}
HAVING COUNT(*) >= ${minimum};`;

    return this.sequelize.query(sql, { type: this.sequelize.QueryTypes.SELECT });
  }

  ensureRequiredParams({ body, required }) {
    const missing = [];
    required.forEach((r) => {
      if (!(r in body)) missing.push(r);
    });
    if (missing.length > 0) {
      const error = new Error(`Missing required parameters: ${missing}`);
      error.status = 400;
      throw error;
    }
  }

  parseSequelizeStatements(json) {
    Object.keys(json).forEach((key) => {
      const newKey = this.convertSequelizeStatements(key);
      if (newKey !== key) {
        json[newKey] = json[key];
        delete json[key];
      }
      if (typeof json[newKey] === 'object') this.parseSequelizeStatements(json[newKey]);
      else json[newKey] = this.convertSequelizeStatements(json[newKey]);
    });
  }

  convertSequelizeStatements(statement) {
    const isArray = Array.isArray(statement);
    const statements = isArray ? statement : [statement];

    const results = statements.map((s) => {
      if (typeof s === 'string') {
        if (s.startsWith('seq:')) {
          const parts = s.split(':');
          return this.sequelize[parts[1]](parts[2]);
        } else if (s.startsWith('$')) {
          const op = s.substring(1);
          return this.sequelize.Op[op];
        }
      }
      return s;
    });
    if (!isArray) return results[0];
    return results;
  }
}
module.exports.API = API;
