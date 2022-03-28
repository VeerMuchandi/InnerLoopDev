# NodeJS App Inner Loop Setup

In this lab, we will learn to setup tooling for inner loop container application development of Spring Boot application.

## Prerequisites

* An editor with Cloud Code such as Cloud Shell Editor or VS Code with Cloud Code extension
* A Kubernetes cluster such as minikube running locally or a GKE cluster configured to use with Cloud Code

## Create a NodeJS Application

```
mkdir mynodejsapp
```
 Right click on the folder `mynodejsapp` and open it as workspace. Open a new terminal again in this workspace.

### Install Node and NPM using NVM

Install NVM

```
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.1/install.sh | bash
```

Close and Open new terminal.

Install node

```
nvm install stable

nvm alias default stable
```

### Initialize a nodejs app

Create a `package.json` file by running
```
npm init
```
Choose the main script as `src/index.js` and rest of the params as defaut. This will create the file with following contents

```
{
  "name": "mynodejsapp",
  "version": "1.0.0",
  "description": "",
  "main": "src/index.js",,
  "scripts": {
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "author": "",
  "license": "ISC"
}
```

### Add code

Create `src/index.js` with the following code

```
const express = require('express');
const app = express();
const PORT = 8080;

app.get('/', (req, res) => {
    var message="Greetings from Node";
    res.send({ message: message });
  });

app.listen(PORT, () => {
  console.log(`Server running at: http://localhost:${PORT}/`);

});
```

Note the PORT is set to value `8080`

Update `package.json` file to include the script for `dev` that starts using `nodemon`. This is required to hot reload changes inside a container when the code changes.

```

  "scripts": {
    "dev": "nodemon src/index.js",
    "start": "node src/index.js",
    "test": "echo \"Error: no test specified\" && exit 1"
  },
```

## Setup build mechanism with Skaffold and Dockerfile

### Add a Skaffold file

Create a file named `skaffold.yaml` with the following content.

```
apiVersion: skaffold/v1
kind: Config
build:
  artifacts:
  - image: mynodejsapp
    context: .
    sync:
      infer: 
      - '**/*.js'  
deploy:
  kubectl:
    manifests:
      - k8s-manifests/deployment.yaml
      - k8s-manifests/service.yaml
```
* This skaffold file uses Dockerfile at the root of this workspace to build the container.
* `sync` copies any changes to `*.js` files to the running container(hot reload)
* `deploy` section refers the manifests for kubernetes service and deployment.

### Add a Dockerfile

This Dockerfile is only for development as we are installing nodemon 
```
FROM node:12-slim

WORKDIR /opt/backend

COPY . /opt/backend
RUN npm install 
RUN npm install express cross-env --save-dev
RUN npm install nodemon -g

CMD ["npm", "run", "dev"] 
```

Also add `.dockerignore` with the following content so that this data is not copied and synced with the running container.

```
node_modules
npm-debug.log
Dockerfile
.dockerignore
skaffold.yaml
k8s-manifests
.git
```

### Add Kubernetes Manifests

Create a folder `k8s-manifests` and the following two files

`k8s-manifests/deployment.yaml` file
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

`k8s-manifests/service.yaml` file

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
{"message":"Greetings from Node"}
```

## Test Hot Reloading

Navigate to `src/index.js`. Edit the code the greeting message to `'Hello from Node'`

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

Test the results.

## Debugging 

Go to the Debug view and stop the current thread.

Click on `Cloud Code` in the bottom menu and select `Debug on Kubernetes` to run the application in `debug` mode.
* In the `Kubernetes Run/Debug - Detailed` view of `Output` window, notice that skaffold will deploy this application in debug mode.
* It will take a couple of mins for the application to build and deploy. You'll notice a debugger attaches this time.
```
[mynodejsapp]
[mynodejsapp]> mynodejsapp@1.0.0 dev /opt/backend
[mynodejsapp]> nodemon src/index.js
[mynodejsapp]
[mynodejsapp][33m[nodemon] 2.0.15[39m
[mynodejsapp][33m[nodemon] to restart at any time, enter `rs`[39m
[mynodejsapp][33m[nodemon] watching path(s): *.*[39m
[mynodejsapp][33m[nodemon] watching extensions: js,mjs,json[39m
[mynodejsapp][32m[nodemon] starting `node --inspect=0.0.0.0:9229 src/index.js`[39m
[mynodejsapp]Debugger listening on ws://0.0.0.0:9229/1a7b8a74-a7e3-4e05-ab98-ac86d0d95286
[mynodejsapp]For help, see: https://nodejs.org/en/docs/inspector
[mynodejsapp]Server running at: http://localhost:8080/
Port forwarding pod/mynodejsapp-deployment-6bc7598798-xl9kj in namespace default, remote port 9229 -> http://127.0.0.1:9229
[mynodejsapp]Debugger attached.
```
* The bottom status bar changes its color from blue to orange indicating that it is in Debug mode.
* In the `Kubernetes Run/Debug` view, notice that a Debuggable container is started
```
**************URLs*****************
Forwarded URL from service mynodejsapp-service: http://localhost:8080
Debuggable container started pod/mynodejsapp-deployment-6bc7598798-xl9kj:mynodejsapp (default)
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
* Note the `message` variable has a value of `Greetings from Node` assigned.
* Double click on the variable and change it to `Greetings from Node on GCP` and press on `OK`
* Press on Continue icon (or F5)
* Notice the output in the browser as `{"message":"Greetings from Node on GCP"}`

Stop the running application thread in the `Debug` view.

Here we have learnt how to navigate the execution flow and run step by step debugging. This is very helpful in quickly identifying issues in the code by watching the running application.

## Summary 

In this lab we have created a basic Node.js application, configured it to build container image using Dockerfile, added Skaffold for interactive application development with containers, added kubernetes manifests and setup application for debugging.

In the next lab, we will continue with this setup and add some additional functionality to this application to make it a CRUD application. 














