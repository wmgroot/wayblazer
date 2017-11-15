const API = require('../api.js').API;

describe('api', () => {

  let api;
  let dataTypes;
  let models;
  let sequelize;
  let _express;
  let _bodyParser;
  let _routeInitializer;

  beforeEach(() => {
    dataTypes = jest.fn();
    models = jest.fn();
    sequelize = jest.fn();
    const expressMock = jest.fn();
    expressMock.use = jest.fn();
    _express = jest.fn(() => expressMock);
    _bodyParser = jest.fn();
    _bodyParser.json = jest.fn(() => 'bpJSON');
    _routeInitializer = jest.fn();

    api = new API({ _bodyParser, _express, _routeInitializer, dataTypes, models, sequelize });
  });

  describe('constructor', () => {
    it('assigns instance variables and initializes the routes', () => {
      expect(api.sequelize).toBeDefined();
      expect(api.dataTypes).toBeDefined();
      expect(api.models).toBeDefined();
      expect(api.sequelize).toBeDefined();
      expect(api.app).toBeDefined();
      expect(api.app.use).toBeCalledWith('bpJSON');
      expect(_routeInitializer).toBeCalled();
    });
  });

  describe('initializeRoutes', () => {
    beforeEach(() => {
      api.route = jest.fn(() => 'routeFunction');
      api.app.get = jest.fn();
      api.app.post = jest.fn();
    });

    it('initializes node express routes', () => {
      api.initializeRoutes();
      expect(api.route.mock.calls).toEqual([
        [{}],
        [{ func: expect.any(Function) }],
        [{}],
        [{ func: expect.any(Function) }],
      ]);
      expect(api.app.get.mock.calls).toEqual([
        ['/resources/:type/_:action', 'routeFunction'],
        ['/resources/:type', 'routeFunction'],
      ]);
      expect(api.app.post.mock.calls).toEqual([
        ['/resources/:type/_:action', 'routeFunction'],
        ['/resources/:type', 'routeFunction'],
      ]);
      expect(api.app.use).toBeCalledWith(expect.any(Function));
    });
  });

  describe('route', () => {
    let action;
    let func;
    let res;

    beforeEach(() => {
      action = jest.fn(() => Promise.resolve('results'));
      func = jest.fn();
      res = jest.fn();
      res.status = jest.fn(() => res);
      res.send = jest.fn(() => res);
      api.parseAction = jest.fn(() => action);
      api.parseSequelizeStatements = jest.fn();
      api.parseInclude = jest.fn();
      api.models = { company: 'company', employee: 'employee' };
      api.sequelize = 'sequelize';
    });

    it('returns the routing function that parses request information', () => {
      const routeFunction = api.route({ func });
      const req = {
        body: { where: { name: 'Bobert' } },
        params: { type: 'employee' },
        query: {},
      };
      return routeFunction(req, res)
        .then(() => {
          expect(api.parseAction).toBeCalledWith({ func });
          expect(api.parseSequelizeStatements).toBeCalledWith({
            where: { name: 'Bobert' },
          });
          expect(api.parseInclude).not.toBeCalled();
          expect(action).toBeCalledWith({
            body: { where: { name: 'Bobert' } },
            models: { company: 'company', employee: 'employee' },
            sequelize: 'sequelize',
            type: 'employee',
          });
          expect(res.status).toBeCalledWith(200);
          expect(res.send).toBeCalledWith({ results: 'results', total: 7 });
        });
    });

    it('parses the include query parameter if it exists', () => {
      api.parseInclude = jest.fn(() => {
        return {
          where: { name: 'Bobert' },
          include: [{ employee: 'company' }],
        }
      });

      const routeFunction = api.route({ func });
      const req = {
        body: { where: { name: 'Bobert' } },
        params: { type: 'employee' },
        query: { include: 'company' },
      };
      return routeFunction(req, res)
        .then(() => {
          expect(api.parseInclude).toBeCalledWith({
            body: { where: { name: 'Bobert' } },
            include: 'company',
          });
          expect(action).toBeCalledWith({
            body: {
              include: [{ employee: 'company' }],
              where: { name: 'Bobert' },
            },
            models: { company: 'company', employee: 'employee' },
            sequelize: 'sequelize',
            type: 'employee',
          });
        });
    });

    it('handles any errors thrown', () => {
      const error = new Error('Something went wrong!')
      action = jest.fn(() => {
        throw error;
      });
      api.parseAction = jest.fn(() => action);

      const routeFunction = api.route({ func });
      const req = {
        body: { where: { name: 'Bobert' } },
        params: { type: 'employee' },
        query: {},
      };
      return routeFunction(req, res)
        .then(() => {
          expect(action).toBeCalledWith({
            body: {
              where: { name: 'Bobert' },
            },
            models: { company: 'company', employee: 'employee' },
            sequelize: 'sequelize',
            type: 'employee',
          });
          expect(res.status).toBeCalledWith(500);
          expect(res.send).toBeCalledWith({ message: 'Something went wrong!', status: 500 });
        });
    });

    it('allows the thrown error to override the status code', () => {
      const error = new Error('Not Found!')
      error.status = 404;
      action = jest.fn(() => {
        throw error;
      });
      api.parseAction = jest.fn(() => action);

      const routeFunction = api.route({ func });
      const req = {
        body: { where: { name: 'Bobert' } },
        params: { type: 'employee' },
        query: {},
      };
      return routeFunction(req, res)
        .then(() => {
          expect(action).toBeCalledWith({
            body: {
              where: { name: 'Bobert' },
            },
            models: { company: 'company', employee: 'employee' },
            sequelize: 'sequelize',
            type: 'employee',
          });
          expect(res.status).toBeCalledWith(404);
          expect(res.send).toBeCalledWith({ message: 'Not Found!', status: 404 });
        });
    });
  });

  describe('parseAction', () => {
    let func;
    beforeEach(() => {
      func = jest.fn();
      api.testAction = jest.fn();
    });

    it('defaults to the provided func', () => {
      expect(api.parseAction({ action: 'testAction', func })).toEqual(func);
    });

    it('falls back to the action string', () => {
      expect(api.parseAction({ action: 'testAction' })).toEqual(api.testAction);
    });

    it('throws an error if no matching action is found', () => {
      expect(() => {
        api.parseAction({ action: 'badAction' })
      }).toThrow('Routing Error: could not find an appropriate route.');
    });
  });

  describe('parseInclude', () => {
    beforeEach(() => {
      api.models = { company: 'company', employee: 'employee' };
    });

    it('merges the provided include into the include body', () => {
      expect(api.parseInclude({
        body: {
          include: [
            { where: { name: 'Bobs Wonder Emporium' } },
          ],
          where: { name: 'Bobert' },
        },
        include: 'company',
      })).toEqual({
        include: [
          {
            model: 'company',
            where: { name: 'Bobs Wonder Emporium' },
          },
        ],
        where: { name: 'Bobert' },
      });
    });

    it('handles multiple include parameters', () => {
      expect(api.parseInclude({
        body: {
          include: [
            { where: { name: 'Bobs Wonder Emporium' } },
          ],
          where: { name: 'Bobert' },
        },
        include: 'company,employee',
      })).toEqual({
        include: [
          {
            model: 'company',
            where: { name: 'Bobs Wonder Emporium' },
          },
          {
            model: 'employee',
          },
        ],
        where: { name: 'Bobert' },
      });
    });

    it('creates an include array if it does not already exist', () => {
      expect(api.parseInclude({
        body: {
          where: { name: 'Bobert' },
        },
        include: 'company',
      })).toEqual({
        include: [
          {
            model: 'company',
          },
        ],
        where: { name: 'Bobert' },
      });
    });

    it('throws an error if the included model is not found', () => {
      expect(() => {
        api.parseInclude({
          body: {
            where: { name: 'Bobert' },
          },
          include: 'company,food_truck,planet',
        });
      }).toThrow("food_truck is not a valid model for 'include=company,food_truck,planet'");
    });
  });

  describe('findAll', () => {
    let models;
    beforeEach(() => {
      models = {
        employee: jest.fn(),
      };
      models.employee.findAll = jest.fn(() => Promise.resolve());
    });

    it('calls the findAll method for the appropriate model', () => {
      return api.findAll({ body: {}, models, type: 'employee' })
        .then(() => {
          expect(models.employee.findAll).toBeCalledWith({});
        });
    });
  });

  describe('findWithAssociatedCount', () => {
    beforeEach(() => {
      api.ensureRequiredParams = jest.fn();
      api.sequelize.query = jest.fn(() => Promise.resolve('results'));
      api.sequelize.QueryTypes = { SELECT: 'SELECT' };
    });

    it('invokes a custom SQL query to find rows with the correct number of associations', () => {
      const body = { association: 'employees', count: 3, table: 'companies' };
      return api.findWithAssociatedCount({ body, type: 'company' }).then((results) => {
        expect(api.ensureRequiredParams).toBeCalledWith({ body, required: ['association', 'count', 'table'] });
        expect(api.sequelize.query).toBeCalledWith(
          `
SELECT *
FROM companies
INNER JOIN (
  SELECT company_id
  FROM employees
  GROUP BY company_id
  HAVING COUNT(employees.id) = 3
) AS employees ON companies.id = employees.company_id;`,
          { type: 'SELECT' }
        );
        expect(results).toEqual('results');
      });
    });
  });

  describe('valueCountForField', () => {
    beforeEach(() => {
      api.ensureRequiredParams = jest.fn();
      api.sequelize.query = jest.fn(() => Promise.resolve('results'));
      api.sequelize.QueryTypes = { SELECT: 'SELECT' };
    });

    it('invokes a custom SQL query to count the occurences of each value for a field', () => {
      const body = { field: 'state', table: 'companies' };
      return api.valueCountForField({ body }).then((results) => {
        expect(api.ensureRequiredParams).toBeCalledWith({ body, required: ['field', 'table'] });
        expect(api.sequelize.query).toBeCalledWith(
          `
SELECT state, COUNT(*)
FROM companies
GROUP BY state
HAVING COUNT(*) >= 0;`,
          { type: 'SELECT' }
        );
        expect(results).toEqual('results');
      });
    });

    it('allows the minimum count to be overriden', () => {
      const body = { field: 'state', minimum: 2, table: 'companies' };
      return api.valueCountForField({ body }).then((results) => {
        expect(sequelize.query).toBeCalledWith(
          `
SELECT state, COUNT(*)
FROM companies
GROUP BY state
HAVING COUNT(*) >= 2;`,
          { type: 'SELECT' }
        );
        expect(results).toEqual('results');
      });
    });
  });

  describe('ensureRequiredParams', () => {
    it('does nothing if all required params are present', () => {
      api.ensureRequiredParams({
        body: { bacon: '', lettuce: '', tomato: '' },
        required: ['bacon', 'lettuce', 'tomato'],
      });
    });

    it('throws an error with all missing parameters', () => {
      expect(() => {
        api.ensureRequiredParams({
          body: { lettuce: '' },
          required: ['bacon', 'lettuce', 'tomato'],
        })
      }).toThrow('Missing required parameters: bacon,tomato');
    });
  });

  describe('parseSequelizeStatements', () => {
    let parseSequelizeStatementsSpy;
    beforeEach(() => {
      parseSequelizeStatementsSpy = jest.spyOn(api, 'parseSequelizeStatements');
      api.convertSequelizeStatements = jest.fn((value) => value);
    });

    it('recursively traverses a json body to insert sequelize symbols', () => {
      const body = {
        include: [
          { model: 'seq:col:employee' },
        ],
        where: {
          name: { $like: 'Jimmy%' },
        },
      };
      const originalBody = Object.assign({}, body);
      api.parseSequelizeStatements(body);
      expect(body).toEqual(originalBody);
      expect(parseSequelizeStatementsSpy.mock.calls).toEqual([
        [body],
        [body.include],
        [body.include[0]],
        [body.where],
        [body.where.name],
      ]);
      expect(api.convertSequelizeStatements.mock.calls).toEqual([
        ['include'],
        ['0'],
        ['model'],
        ['seq:col:employee'],
        ['where'],
        ['name'],
        ['$like'],
        ['Jimmy%'],
      ]);
    });
  });

  describe('convertSequelizeStatements', () => {
    beforeEach(() => {
      api.sequelize.col = jest.fn((identifier) => `SeqCol:${identifier}`);
      api.sequelize.Op = { like: 'SeqOp:like' };
    });

    it('converts strings to sequelize symbol if necessary', () => {
      expect(api.convertSequelizeStatements(['$like', 'seq:col:employees.id']))
        .toEqual(['SeqOp:like', 'SeqCol:employees.id']);
    });

    it('converts arrays of strings to sequelize symbol if necessary', () => {
      expect(api.convertSequelizeStatements(['bears', '$like'])).toEqual(['bears', 'SeqOp:like']);
    });

    it('converts non-array string values', () => {
      expect(api.convertSequelizeStatements('seq:col:employees.id')).toEqual('SeqCol:employees.id');
    });

    it('ignores strings that cannot be converted', () => {
      expect(api.convertSequelizeStatements('bears')).toEqual('bears');
    });
  });
});
