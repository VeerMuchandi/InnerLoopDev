# Nodejs - Inner Loop development

In the previous lab, we learnt to setup a Nodejs application for interactive inner loop development. In this lab, we will use the setup and add some code to build CRUD application

**NOTE:** The intent of this lab is not to teach the language, but to learn how the tooling we setup improves developer productivity.

## Prerequisites
* Basic application and interactive development setup from the [previous lab](./NodeJsInnerLoopSetup.md)
* [A database](./SetupCloudSQL.md) to connect this application code and test

## Add dependencies to `package.json`

Add two more dependencies `pg` and `sequelize` to `package.json` file to build a CRUD application Postgres. Post changes the dependencies section would look like this.

```
  "dependencies": {
    "express": "^4.16.4",
    "pg": "^8.7.3",
    "sequelize": "^6.17.0"
  }
```

## Add CRUD code

Add app folder from [here](./nodejs-crudcode/app) to add CRUD code to this application.

This code has 
* [models](./nodejs-crudcode/app/models) folder with the entity model for `item`
* [controllers](./nodejs-crudcode/app/controllers) folder with the code that does CRUD operations
* [routes](./nodejs-crudcode/app/routes) folder that routes specific URL patterns to different calls
* [config](./nodejs-crudcode/app/config) folder with database connectivity details

Note the database configuration in `db.config.js` file refers the environment variables that need to be supplied to connect to the database.

```
module.exports = {
    HOST: process.env.DB_HOST,
    USER: process.env.DB_USER,
    PASSWORD: process.env.DB_PASS,
    DB: process.env.DB_NAME,
    dialect: "postgres",
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  };
```


Add the following code snippet in `src/index.js` to be able to connect to the CRUD code from your main javascript file.

```
const db = require("../app/models");
db.sequelize.sync();
require("../app/routes/item.routes")(app);
```

Once added your code in `src/index.js` should look like this.

```
const express = require('express');
const app = express();
const PORT = 8080;

const bodyParser = require('body-parser')
app.use(bodyParser.json())
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
)

app.get('/', (req, res) => {
    var message="Hello from Node";
    res.send({ message: message });
  });


const db = require("../app/models");
db.sequelize.sync();
require("../app/routes/item.routes")(app);

app.listen(PORT, () => {
  console.log(`Server running at: http://localhost:${PORT}/`);

});
```




## Add database connectivity configuration to K8S yamls

Edit the deployment in the `deployment.yaml` file to add the environment variables to supply the Database connectivity information. **Note** This connnection info is coming from the database we set up earlier in [this lab](./SetupCloudSQL.md). 

```
    spec:
      containers:
      - name: mynodejsapp
        image: mynodejsapp
        env:
        - name: DB_HOST
          value: "[PRIVATEIP OF DATABASE]"        
        - name: DB_PORT
          value: "5432"  
        - name: DB_USER
          valueFrom:
            secretKeyRef:
              name: gke-cloud-sql-secrets
              key: username
        - name: DB_PASS
          valueFrom:
            secretKeyRef:
              name: gke-cloud-sql-secrets
              key: password
        - name: DB_NAME
          valueFrom:
            secretKeyRef:
              name: gke-cloud-sql-secrets
              key: database
```


## Test

Run the application on Kubernetes with `Cloud Code`-> `Run/Debug on Kubernetes`. Note the URL provided in the `Kubernetes: Run/Debug` view and assign it to a variable `URL`.

Post a couple of records. You can use a tool like httpie as shown below.

```
curl -X POST $URL/items -d '{"itemName":"Body Spray", "itemPrice":3.2}' -H "Content-Type: application/json"
curl -X POST $URL/items -d '{"itemName":"Nail Cutter", "itemPrice":2.5}' -H "Content-Type: application/json"
```

Now test the GET by running the `$URL/items` in the browser. You can also run the curl from the command line

```
curl -X GET $URL/items
```

Now try to delete an item by running. Change the value of item-id if required.

```
curl -X DELETE $URL/items/1
```

It throws an error message `{"message":"Could not delete Item with id=undefined"`

## Identify and fix the issue
Restart the application in Debug mode and find the issue. Here are some tips:
* We know something is wrong with the DELETE as it is not returning the desired result. So you would set breakpoint in `itemcontroller.js`->`exports.delete` method.
* Run step by step execution and watch the variables at each step to observe the values of local variables in the left window.
* To observe specific value such as `request.params` add this variable to the Watch window. 

Notice that the value assigned to `id` is `undefined`. Change the code to fix the issue.

The fixed code snippet would look like this.

```
// Delete a Item with the specified id in the request
exports.delete = (req, res) => {
    const id = req.params.id;
```

Test again by trying to delete.


### Update Test

```
curl -X PUT $URL/items/2 -d '{"itemName":"Nail Cutter", "itemPrice":3.5}' -H "Content-Type: application/json"
```

Verify changes by running GET again

## Summary

Congratulations! In this lab you practiced and perfected your hot reloading and debugging skills while building a Nodejs CRUD application.






