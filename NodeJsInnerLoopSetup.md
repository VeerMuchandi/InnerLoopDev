# NodeJS App Inner Loop Setup

In this lab, we will learn to setup tooling for inner loop container application development of Spring Boot application.

## Prerequisites

* An editor with Cloud Code such as Cloud Shell Editor or VS Code with Cloud Code extension
* A Kubernetes cluster such as minikube running locally or a GKE cluster configured to use with Cloud Code

## Create a NodeJS Application

```
mkdir mynodejsapp
```
Open this folder as workspace

### Install NPM

```
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.1/install.sh | bash

Close terminal
Open new terminal

nvm install stable

nvm alias default stable
```

### Initialize a nodejs app
```
npm init
npm i express sequelize pg
```

### Add code

Create `src/index.js` with the following code

```
const express = require('express');
const app = express();
const PORT = 8080;

app.get('/', (req, res) => {
  res.send({ message: 'Hello World!!' });
});

app.listen(PORT, () => {
  console.log(`Server running at: http://localhost:${PORT}/`);
});
```

Note the PORT is set to value `8080`

Update `package.json` file to include the script for `dev`

```

  "scripts": {
    "dev": "node src/index.js",
    "test": "echo \"Error: no test specified\" && exit 1"
  },
```

## Setup build mechanism with Skaffold and Dockerfile

### Add a Skaffold file

```
apiVersion: skaffold/v1
kind: Config
build:
  artifacts:
  - image: gcr.io/veer-dil1/mynodejsapp
    context: .
    sync:
      infer: 
      - '*.js'  
deploy:
  kubectl:
    manifests:
      - k8s-manifests/deployment.yaml
      - k8s-manifests/service.yaml
```

### Add a Dockerfile

This Dockerfile is only for development, not to be used in production. It uses `nodemon` so that nodejs can recognize the file changes and immediately reload.

```
FROM node:12-slim

WORKDIR /opt/backend

COPY . /opt/backend
RUN npm install 
RUN npm install cross-env --save-dev
RUN npm install nodemon -g

CMD ["nodemon", "run", "dev"] 
```

Add `.dockerignore` with the following contents

```
node_modules
npm-debug.log
Dockerfile
.dockerignore
skaffold.yaml
k8s-manifests
.git
.vscode
```

### Add Kubernetes Manifests

k8s-manifests/deployment.yaml
```
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mynodejsapp-deployment
spec:
  selector:
    matchLabels:
      app: mynodejsapp
  template:
    metadata:
      labels:
        app: mynodejsapp
    spec:
      containers:
      - name: mynodejsapp
        image: gcr.io/veer-dil1/mynodejsapp
        resources:
          requests:
            memory: "32Mi"
            cpu: "100m"
          limits:
            memory: "128Mi"
            cpu: "500m"
        ports:
        - containerPort: 8080

```

k8s-manifests/service.yaml

```
apiVersion: v1
kind: Service
metadata:
  name: mynodejsapp-service
spec:
  type: ClusterIP
  selector:
    app: mynodejsapp
  ports:
  - port: 8080
    targetPort: 8080
```

## Run the application on Kubernetes

Press `F1` to bring up top menu. Choose `Cloud Code: Run on Kubernetes`. Skaffold will start to build and deploy the application on the Kubernetes cluster. 

In the `Output` window, switch to `Kubernetes: Run/Debug - Detailed View` and watch the logs that are streamed in this view:
* docker will be used to build nodejs app and to containerize it
* Container created with name `gcr.io/PROJECTNAME/mynodejsapp` 
* Container will be deployed as a kubernetes pod and a service is created
* The pod logs will be streamed to show the springboot application coming up.

Switch back to `Kubernetes: Run/Debug` view in the `Output` window. You'll see 

```
**************URLs*****************
Forwarded URL from service mynodejsapp-service: http://localhost:8080
Update succeeded
***********************************
```
Hover over this URL and click on `Open Web Preview`.

The application opens up in a new browser tab and a simple greeting is displayed

```
{"message":"Hello World!!"}
```

## Test Hot Reloading

Navigate to `src/index.js`. Edit the code the greeting message to `'Greetings from Node!'`

Notice immediately that in the `Output` window, `Kubernetes: Run/Debug` view, the watcher syncs the updated files with the container in Kubernetes

```
Update initiated
File sync started for 1 files for gcr.io/veer-dil1/mynodejsapp:697d3c1-dirty@sha256:5f4f0922ccf4a87881b3c343aaec7d8b3f33da7524f82686e42c4db553c444d4
File sync succeeded for 1 files for gcr.io/veer-dil1/mynodejsapp:697d3c1-dirty@sha256:5f4f0922ccf4a87881b3c343aaec7d8b3f33da7524f82686e42c4db553c444d4
Update succeeded
```

If you switch to `Kubernetes: Run/Debug - Detailed` view, you will notice that the nodemon recognizes the file changes and restarts mpde

```
mynodejsapp:697d3c1-dirty@sha256:5f4f0922ccf4a87881b3c343aaec7d8b3f33da7524f82686e42c4db553c444d4
Watching for changes...
[mynodejsapp][32m[nodemon] starting `node run dev src/index.js`[39m
[mynodejsapp]Server running at: http://localhost:8080
```

Refresh the browser tab to notice the changes to the greeting message.

Make an additional code changes to observe how the speed of development improves with hot reloading.

* Rather than returning the message directly we will return a String variable

```
    var message="Greetings from Node";
    res.send({ message: message });
```

Test the results.

## Debugging  **WORK IN PROGRESS**

Go to the Debug view and stop the current thread.

Click on `Cloud Code` in the bottom menu and select `Debug on Kubernetes` to run the application in `debug` mode.
* In the `Kubernetes Run/Debug - Detailed` view of `Output` window, notice that skaffold will deploy this application in debug mode.
* It will take a couple of mins for the application to build and deploy.
* The bottom status bar changes its color from blue to orange indicating that it is in Debug mode.
* In the `Kubernetes Run/Debug` view, notice that a Debuggable container is started
```
**************URLs*****************
Forwarded URL from service mynodejsapp-service: http://localhost:8080
Debuggable container started pod/mynodejsapp-deployment-75ddb9b6d-fpfps:mynodejsapp (default)
Update succeeded
***********************************
```


Navigate to `src/index.js`.
* Click on the left side of the number line to set a breakpoint at this statement `var message="Greetings from Node";`. Breakpoint is indicated by a red dot towards the left of the line number.
* Switch to Debug view and notice the two threads and breakpoints tab has `index.js` listed

Run the application by opening the URL in web preview in a browser. The browser would be waiting. Switch back to the editor and you will notice that the control stops at the breakpoint. In the Debug view

* Notice the call stack
* Expand `Local` in the Variables to watch the variables
* Press on step over icon (or F10) to move to the next step
* Note the `message` variable has a value of `Hello World!!` assigned.
* Double click on the variable and change it to `Hello Earth!` and press on `OK`
* Press on Continue icon (or F5)
* Notice the output in the browser as `Hello Earth!!`

Stop the running application thread in the `Debug` view.

Here we have learnt how to navigate the execution flow and run step by step debugging. This is very helpful in quickly identifying issues in the code by watching the running application.

## Summary 

In this lab we have created a basic SpringBoot application, configured it to build container image using Jib, added Skaffold for interactive application development with containers, added kubernetes manifests and setup application for debugging.

In the next lab, we will continue with this setup and add some additional functionality to this application to make it a CRUD application. 














