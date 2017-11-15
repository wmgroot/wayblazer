# wayblazer
Postgres API Coding Exercise for WayBlazer

## Setup

### Postgres
This API assumes you have a working local postgres database that you can connect to.
Postgres can be found here: https://www.postgresql.org/download/

Some tests may fail due to the order that Postgres stores and returns data. I am using Postgres 10.1. The order of the data returned by the API is not guaranteed, to provided the best performance. Due to the limitations of Frisby (the http test framework I decided to use), I am limited on the expectations I can execute on the returned response. To solve this, I would use a more robust test framework in the future.

### Node
This application was built using Node. It was tested with Node 8.9, but should work with Node 6 as well.
Node can be found here: https://nodejs.org/en/

### Yarn
The project includes a few yarn scripts that will help you run the data importer, api, and tests from the root of the project. It is recommended that you have yarn installed to make use of these helpers.
Yarn can be found here: https://yarnpkg.com/en/docs/install

### Building
From the root directory, run:
```
yarn build
```
This should install all dependencies for each project.

## Importer
To run the data importer, first ensure you have postgres running locally.

Then, run the importer from the project root using:
```
yarn importer --database=Matt --file=data/us-500.csv
```
Where database is the database name you'd like to write to, and file is a path to the CSV containing the data you'd like to import.

You can also provide a username and password, if you need to:
```
yarn importer --database=Matt --file=data/us-500.csv --username=bob --password=alice
```

## API
To start the API, again ensure you have Postgres running locally, with any data you'd like available already imported.
Run the API server script from the project root:
```
yarn api --database=Matt
```
Again providing the database name, and if necessary, the username and password.

### Using the API
To use the API, simply make HTTP requests to `http://localhost:8000` using the http client of your choice.
Make sure you provide the header `Content-Type: application/json`, or else your request bodies will be ignored.
```
curl -XGET -H 'Content-Type: application/json' http://localhost:8000/resources/employee -d '{"where":{"first_name":"James"}}'

{
  "total":1,
  "results":[
    {
      "id":1,
      "first_name":"J",
      "last_name":"B",
      "phone_number":"XXX-XXX-X427",
      "email":"xxxxx@gmail.com",
      "created_at":"2017-11-13T20:11:45.741Z",
      "updated_at":"2017-11-13T20:11:45.741Z",
      "company_id":1
    }
  ]
}
```

To include data from a different table, you must provide an `include` query parameter in your http request:
```
curl -XGET -H 'content-type: application/json' 'http://localhost:8000/resources/employee?include=company' \
  --data '{  
  "include":[  
    {  
      "where":{  
        "$not":{  
          "state":"CA"
        }
      }
    }
  ],
  "where":{  
    "email":{  
      "$like":"%@gmail.com"
    }
  }
}'

{  
  "total":53,
  "results":[  
    {  
      "id":1,
      "first_name":"J",
      "last_name":"B",
      "phone_number":"XXX-XXX-X427",
      "email":"xxxxx@gmail.com",
      "created_at":"2017-11-16T00:18:15.101Z",
      "updated_at":"2017-11-16T00:18:15.101Z",
      "company_id":1,
      "company":{  
        "id":1,
        "name":"Benton, John B Jr",
        "address1":"6649 N Blue Gum St",
        "city":"New Orleans",
        "county":"Orleans",
        "state":"LA",
        "zip":"70116",
        "phone_number":"504-621-8927",
        "website":"http://www.bentonjohnbjr.com",
        "created_at":"2017-11-16T00:18:15.080Z",
        "updated_at":"2017-11-16T00:18:15.080Z"
      }
    },
    ...
  ]
}
```

## Tests
API integration tests are located in `__tests__/api_integration.js`, and API unit tests are located in `api/__tests__/api_spec.js`.
Integration tests require Postgres to be available, but the unit tests do not.

To run the integration and units test for the API, run this command from the project root:
```
yarn test
```
