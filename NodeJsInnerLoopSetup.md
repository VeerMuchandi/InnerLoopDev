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
Choose the main script as `src/index.js` and default values for the rest of the parameters. This will create the file with following contents

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

Edit this file to include start command in the script `"start": "node src/index.js",`. After the change the scripts should look like the code snippet below:

```
  "scripts": {
    "start": "node src/index.js",
    "test": "echo \"Error: no test specified\" && exit 1"
  },
```

The code that we are going to add also uses `express` so let us add that dependency to this `package.json` file. So after all the changes the `package.json` file should be as shown below.


```
{
  "name": "mynodejsapp",
  "version": "1.0.0",
  "description": "",
  "main": "src/index.js",
  "scripts": {
    "start": "node src/index.js",
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "author": "Veer Muchandi",
  "license": "ISC",
  "dependencies": {
    "express": "^4.16.4"
  }
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

## Setup build mechanism with Skaffold and GCP Build Packs

Open a terminal and run the following command to initialize skaffold, generate kubernetes manifests and setup build using GCP build packs

```
skaffold init --generate-manifests
```
* Type in port `8080` to port-forward to
* `y` to write the generated configurations and manifests.

The above step generates a `skaffold.yaml` file and a `deployment.yaml` file. All artifacts are named `package-json-image` by default. We need to edit them.

Open the `skaffold.yaml` file

* Select the image name currently set as `package-json-image`.
* Right click and choose `Change All Occurences`
* Type in the new name as `mynodejsapp`

Notice the `build` section uses `buildpacks` to containerize the application. This code doesn't have Dockerfile and the developer doesnt need any knowledge of docker to containerize this application.

```
build:
  artifacts:
  - image: mynodejsapp
    buildpacks:
      builder: gcr.io/buildpacks/builder:v1
```

Similary, open `deployment.yaml` file and change all occurences of `package-json-image` to `mynodejsapp`. Notice that this file has two manifests:

* a kubernetes deployment that deploys a pod with the container image
* a kubernetes service that front ends the pod



## Run the application on Kubernetes

Press `F1` to bring up top menu. Choose `Cloud Code: Run on Kubernetes`. Skaffold will start to build and deploy the application on the Kubernetes cluster. 

Confirm the image registry if asked.

In the `Output` window, switch to `Kubernetes: Run/Debug - Detailed View` and watch the logs that are streamed in this view:
* buildpacks will be used to build nodejs app and to containerize it
* Container created with name `gcr.io/PROJECTNAME/mynodejsapp` 
* Container will be deployed as a kubernetes pod and a service is created
* The pod logs will be streamed to show the springboot application coming up.

Switch back to `Kubernetes: Run/Debug` view in the `Output` window. You'll see 

```
**************URLs*****************
Forwarded URL from service mynodejsapp: http://localhost:8080
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
File sync started for 1 files for gcr.io/veer-dil1/mynodejsapp:latest@sha256:f554756b3b4d6c301c4b26ef96102227cfa2833270db56241248ae42baa1971a
File sync succeeded for 1 files for gcr.io/veer-dil1/mynodejsapp:latest@sha256:f554756b3b4d6c301c4b26ef96102227cfa2833270db56241248ae42baa1971a
Update succeeded
```

If you switch to `Kubernetes: Run/Debug - Detailed` view, you will notice it recognizes file changes and restarts node

```
files modified: [src/index.js]
Copying files:map[src/index.js:[/workspace/src/index.js]]togcr.io/veer-dil1/mynodejsapp:latest@sha256:f554756b3b4d6c301c4b26ef96102227cfa2833270db56241248ae42baa1971a
Syncing 1 files for gcr.io/veer-dil1/mynodejsapp:latest@sha256:f554756b3b4d6c301c4b26ef96102227cfa2833270db56241248ae42baa1971a
Watching for changes...
[mynodejsapp]
[mynodejsapp]> mynodejsapp@1.0.0 start /workspace
[mynodejsapp]> node src/index.js
[mynodejsapp]
[mynodejsapp]Server running at: http://localhost:8080/
```

Refresh the browser tab to notice the changes to the greeting message.


## Debugging 

Go to the Debug view and stop the current thread.

Click on `Cloud Code` in the bottom menu and select `Debug on Kubernetes` to run the application in `debug` mode.
* In the `Kubernetes Run/Debug - Detailed` view of `Output` window, notice that skaffold will deploy this application in debug mode.
* It will take a couple of mins for the application to build and deploy. You'll notice a debugger attaches this time.

```
Port forwarding pod/mynodejsapp-6bbcf847cd-vqr6v in namespace default, remote port 9229 -> http://127.0.0.1:9229
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

In this lab we have created a basic Node.js application, configured it to build container image using GCP build packs, added Skaffold for interactive application development with containers, added kubernetes manifests and setup application for debugging.

In the next lab, we will continue with this setup and add some additional functionality to this application to make it a CRUD application. 














