const frisby = require('frisby');
const Joi = frisby.Joi;

describe('api', () => {
  const api = 'http://localhost:8000';
  const headers = {
    'Content-Type': 'application/json',
  };

  describe('GET', () => {
    it('an invalid route should return a 404', function (done) {
      frisby.fetch(`${api}`, {
        headers,
        method: 'GET',
        body: JSON.stringify({}),
      })
      .expect('status', 404)
      .done(done);
    });
  });

  describe('DELETE', () => {
    it('an invalid route should return a 404', function (done) {
      frisby.fetch(`${api}/regrets`, {
        headers,
        method: 'DELETE',
        body: JSON.stringify({}),
      })
      .expect('status', 404)
      .done(done);
    });
  });

  // the http client frisby is using can't send a json body with a GET parseSequelizeStatements
  // we'll use POST instead
  // additionally, I normally would not write expectations around the order the data is returned in
  // but frisby is extremely limited in what it allows me to assert about the response data
  describe('POST', () => {
    it('should throw a 400 error for a type that does not exist', function (done) {
      frisby.fetch(`${api}/resources/taco`, {
        headers,
        method: 'POST',
        body: JSON.stringify({
          where: { name: 'Tacodeli' },
        }),
      })
      .expect('status', 400)
      .expect('json', 'message', "Type 'taco' does not exist!")
      .done(done);
    });

    it('should retrieve all companies', function (done) {
      frisby.fetch(`${api}/resources/company`, {
        headers,
        method: 'POST',
        body: JSON.stringify({}),
      })
      .expect('status', 200)
      .expect('json', 'total', 379)
      .expect('jsonTypes', 'results.*', {
        id: Joi.number().required(),
        name: Joi.string().required(),
        created_at: Joi.date().iso().required(),
        updated_at: Joi.date().iso().required(),
      })
      .expect('jsonTypes', 'results.0', {
        id: 1,
  			name: 'Benton, John B Jr',
  			address1: '6649 N Blue Gum St',
  			city: 'New Orleans',
  			county: 'Orleans',
  			state: 'LA',
  			zip: '70116',
  			phone_number: '504-621-8927',
  			website: 'http://www.bentonjohnbjr.com',
      })
      .expect('jsonTypes', 'results.379', {
        id: 379,
  			name: 'Affiliated With Travelodge',
  			address1: '63 E Aurora Dr',
  			city: 'Orlando',
  			county: 'Orange',
  			state: 'FL',
  			zip: '32804',
  			phone_number: '407-413-4842',
  			website: 'http://www.affiliatedwithtravelodge.com',
      })
      .done(done);
    });

    it('should ignore invalid sequelize parameters', function (done) {
      frisby.fetch(`${api}/resources/company`, {
        headers,
        method: 'POST',
        body: JSON.stringify({
          bad: { mojo: 'man' },
        }),
      })
      .expect('status', 200)
      .expect('json', 'total', 379)
      .done(done);
    });

    it('should retrieve all employees', function (done) {
      frisby.fetch(`${api}/resources/employee`, {
        headers,
        method: 'POST',
        body: JSON.stringify({}),
      })
      .expect('status', 200)
      .expect('json', 'total', 500)
      .expect('jsonTypes', 'results.*', {
        id: Joi.number().required(),
        first_name: Joi.string().required(),
        last_name: Joi.string().required(),
        created_at: Joi.date().iso().required(),
        updated_at: Joi.date().iso().required(),
      })
      .expect('jsonTypes', 'results.0', {
        id: 1,
  			first_name: 'James',
  			last_name: 'Butt',
  			phone_number: '504-845-1427',
  			email: 'jbutt@gmail.com',
  			company_id: 1,
  			company: {
  				id: 1,
  				name: 'Benton, John B Jr',
  				address1: '6649 N Blue Gum St',
  				city: 'New Orleans',
  				county: 'Orleans',
  				state: 'LA',
  				zip: '70116',
  				phone_number: '504-621-8927',
  				website: 'http://www.bentonjohnbjr.com',
  			},
      })
      .expect('jsonTypes', 'results.500', {
        id: 500,
  			first_name: 'Chauncey',
  			last_name: 'Motley',
  			phone_number: '407-557-8857',
  			email: 'chauncey_motley@aol.com',
  			company_id: 379,
  			company: {
  				id: 379,
  				name: 'Affiliated With Travelodge',
  				address1: '63 E Aurora Dr',
  				city: 'Orlando',
  				county: 'Orange',
  				state: 'FL',
  				zip: '32804',
  				phone_number: '407-413-4842',
  				website: 'http://www.affiliatedwithtravelodge.com',
  			},
      })
      .done(done);
    });

    it('should retrieve all employees working for Rapid Trading', function (done) {
      frisby.fetch(`${api}/resources/employee?include=company`, {
        headers,
        method: 'POST',
        body: JSON.stringify({
          include: [{
      			where: { name: 'Rapid Trading Intl' },
      		}],
        }),
      })
      .expect('status', 200)
      .expect('json', 'total', 70)
      .expect('jsonTypes', 'results.*', {
        company: {
  				name: 'Rapid Trading Intl',
  			}
      })
      .expect('jsonTypes', 'results.0', {
        id: 43,
  			first_name: 'Roxane',
  			last_name: 'Campain',
  			company_id: 4,
  			company: {
  				id: 4,
  				name: 'Rapid Trading Intl',
		    },
      })
      .expect('jsonTypes', 'results.70', {
        id: 112,
  			first_name: 'Sue',
  			last_name: 'Kownacki',
  			company_id: 4,
  			company: {
  				id: 4,
  				name: 'Rapid Trading Intl',
  			}
      })
      .done(done);
    });

    it('should retrieve all companies in Texas', function (done) {
      frisby.fetch(`${api}/resources/company`, {
        headers,
        method: 'POST',
        body: JSON.stringify({
          where: { state: 'TX' },
        }),
      })
      .expect('status', 200)
      .expect('json', 'total', 24)
      .expect('jsonTypes', 'results.*', {
        company: {
  				state: 'TX',
  			}
      })
      .expect('jsonTypes', 'results.0', {
        id: 18,
  			name: 'Ninas Indian Grs & Videos',
  			state: 'TX',
      })
      .expect('jsonTypes', 'results.24', {
        id: 356,
  			name: 'Mcgraths Seafood',
  			state: 'TX',
      })
      .done(done);
    });

    it('should retrieve all zip codes in CA', function (done) {
      frisby.fetch(`${api}/resources/company`, {
        headers,
        method: 'POST',
        body: JSON.stringify({
          attributes: ['zip'],
        	group: ['zip'],
        	where: {
        		state: 'CA',
        	},
        }),
      })
      .expect('status', 200)
      .expect('json', 'total', 45)
      .expect('jsonTypes', 'results.0', {
        zip: '94044',
      })
      .expect('jsonTypes', 'results.44', {
        zip: '94104',
      })
      .done(done);
    });

    it('should retrieve all employees with a gmail not in CA', function (done) {
      frisby.fetch(`${api}/resources/employee?include=company`, {
        headers,
        method: 'POST',
        body: JSON.stringify({
          include: [
        		{
        			where: {
        				$not: {
        					state: 'CA',
        				},
        			},
        		},
        	],
        	where: {
        		email: {
        			$like: '%@gmail.com',
        		},
        	},
        }),
      })
      .expect('status', 200)
      .expect('json', 'total', 53)
      .expect('jsonTypes', 'results.0', {
        id: 1,
  			first_name: 'James',
  			last_name: 'Butt',
  			email: 'jbutt@gmail.com',
  			company_id: 1,
  			company: {
  				id: 1,
  				name: 'Benton, John B Jr',
  				state: 'LA',
  			},
      })
      .expect('jsonTypes', 'results.52', {
        id: 493,
  			first_name: 'Jovita',
  			last_name: 'Oles',
  			email: 'joles@gmail.com',
  			company_id: 372,
  			company: {
  				id: 372,
  				name: 'Pagano, Philip G Esq',
  				state: 'FL',
  			},
      })
      .done(done);
    });

    describe('_findWithAssociatedCount', () => {
      it('should retrieve all companies with 0 employees', function (done) {
        frisby.fetch(`${api}/resources/company/_findWithAssociatedCount`, {
          headers,
          method: 'POST',
          body: JSON.stringify({
            association: 'employees',
          	count: 0,
          	table: 'companies',
          }),
        })
        .expect('status', 200)
        .expect('json', 'total', 0)
        .done(done);
      });

      it('should retrieve all companies with 3 employees', function (done) {
        frisby.fetch(`${api}/resources/company/_findWithAssociatedCount`, {
          headers,
          method: 'POST',
          body: JSON.stringify({
            association: 'employees',
          	count: 3,
          	table: 'companies',
          }),
        })
        .expect('status', 200)
        .expect('json', 'total', 2)
        .expect('jsonTypes', 'results.0', {
          id: 6,
          name: 'Biltmore Investors Bank',
        })
        .expect('jsonTypes', 'results.1', {
          id: 7,
          name: 'Bailey Cntl Co Div Babcock',
        })
        .done(done);
      });

      it('should throw a 400 error if required params are not provided', function (done) {
        frisby.fetch(`${api}/resources/company/_findWithAssociatedCount`, {
          headers,
          method: 'POST',
          body: JSON.stringify({}),
        })
        .expect('status', 400)
        .expect('json', 'message', 'Missing required parameters: association,count,table')
        .done(done);
      });
    });

    describe('_valueCountForField', () => {
      it('should retrieve a list of counts for a field', function (done) {
        frisby.fetch(`${api}/resources/company/_valueCountForField`, {
          headers,
          method: 'POST',
          body: JSON.stringify({
            field: 'state',
          	table: 'companies',
          }),
        })
        .expect('status', 200)
        .expect('json', 'total', 46)
        .expect('jsonTypes', 'results.0', {
          state: 'MT',
			    count: '1',
        })
        .expect('jsonTypes', 'results.45', {
          state: 'AK',
			    count: '2',
        })
        .done(done);
      });

      it('should retrieve a list of counts for a field respecting the minimum', function (done) {
        frisby.fetch(`${api}/resources/company/_valueCountForField`, {
          headers,
          method: 'POST',
          body: JSON.stringify({
            field: 'state',
            minimum: 2,
          	table: 'companies',
          }),
        })
        .expect('status', 200)
        .expect('json', 'total', 36)
        .expect('jsonTypes', 'results.0', {
          state: 'LA',
			    count: '7',
        })
        .expect('jsonTypes', 'results.45', {
          state: 'AK',
			    count: '2',
        })
        .done(done);
      });

      it('should retrieve a list of shared phone numbers', function (done) {
        frisby.fetch(`${api}/resources/employee/_valueCountForField`, {
          headers,
          method: 'POST',
          body: JSON.stringify({
            field: 'phone_number',
            minimum: 2,
          	table: 'employees',
          }),
        })
        .expect('status', 200)
        .expect('json', 'total', 2)
        .expect('jsonTypes', 'results.0', {
          phone_number: '330-566-8898',
			    count: '2',
        })
        .expect('jsonTypes', 'results.45', {
          phone_number: '504-845-1427',
			    count: '8',
        })
        .done(done);
      });

      it('should throw a 400 error if required params are not provided', function (done) {
        frisby.fetch(`${api}/resources/employee/_valueCountForField`, {
          headers,
          method: 'POST',
          body: JSON.stringify({}),
        })
        .expect('status', 400)
        .expect('json', 'message', 'Missing required parameters: field,table')
        .done(done);
      });
    });
  });
});
