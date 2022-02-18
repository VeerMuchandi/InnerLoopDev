# Quarkus - Inner loop setup

## Prerequisites

* An editor with Cloud Code such as Cloud Shell Editor or VS Code with Cloud Code extension
* A kubernetes cluster such as minikube running locally or a GKE cluster configured to use with Cloud Code

## Create a Quarkus App 

Open the editor

Open a new terminal in the editor `Terminal`-> `New Terminal`.

Run the following command on your terminal

```
mvn io.quarkus:quarkus-maven-plugin:1.0.0.CR1:create \
-DprojectGroupId=org.acme \
-DprojectArtifactId=myquarkusapp \
-DclassName="org.acme.quickstart.GreetingResource" \
-Dpath="/hello"
```

This will create a new folder named `myquarkusapp` and generate simple hello world code in this folder.

In the explorer view, right click on the `myquarkusapp` folder and `Open as Workspace`. This will make this folder a new workspace.

Explore the folder structure.
* Source code is in `src/main/java` directory. Note the `GreetingResource.java` file that outputs a `hello` message

* Quarkus also comes with Dockerfiles in `src/main/docker`. You will see a dockerfile to run the application on a JVM and also another one to compile the application as a native application without using JVM.

## Set up a Dockerfile for dev

We will add a dockerfile to run a maven container that runs the quarkus application in dev mode. Running in dev mode in a container will allow us to sync and test changes from the editor to the container running in a pod.

* Add a new dockerfile under `src/main/docker` with name `Dockerfile.dev`
* Add the following contents to this file. Note that this runs a maven container with the command `mvn clean compile quarkus:dev`

```
FROM quay.io/quarkus/centos-quarkus-maven:19.3.1-java8 as build

# If you want to use nexus or any other maven repository manager then
# uncomment this to point to the repo manager
# ENV MAVEN_MIRROR_URL http://nexus:8081/nexus/repository/maven-public/

USER root

RUN mkdir -p /usr/src/app && \
    chown -R quarkus /usr/src/app

USER quarkus

# Set the maven mirrors in the maven settings if available

RUN /usr/local/bin/entrypoint-run.sh

COPY --chown=quarkus:root src /usr/src/app/src

COPY --chown=quarkus:root pom.xml /usr/src/app/

WORKDIR /usr/src/app

CMD [ "mvn","clean","compile", "quarkus:dev" ]
```

* Add `!pom.xml` to `.dockerignore` file so that it can copy the `pom.xml` file. The file should look like this after the changes

```
*
!target/*-runner
!target/*-runner.jar
!target/lib/*
!pom.xml
```

## Set up Skaffold and Kubernetes Manifests 

Add a new file under the workspace named `skaffold.yaml`

Start editing the file and press `Ctrl`+`Space` to get the code generator. Pick `Skaffold - Getting -started`

Edit the skaffold.yaml to
* edit the `build.artifacts.image` name to use your project and name `myquarkusapp`
* add `build.local.push=true` to push images built locally to the registry
* add `docker` as the build method, point to the `dockerfile` that we just created and set `noCache=false`
* setup `sync` section to hot reload the local code changes to `java` files and `pom.xml` into the running container
* setup kubernetes manifests location in the `deploy.kubectl.manifests` section. We will add these manifests in a moment

as shown below

```
apiVersion: skaffold/v1
kind: Config
build:
  local:
    push: true
  artifacts:
  - image: gcr.io/PROJECTNAME/myquarkusapp
    docker:
      dockerfile: ./src/main/docker/Dockerfile.dev
      noCache: false
    sync:
      infer:
       - "**/*.java"
       - 'pom.xml'
deploy:
  kubectl:
    manifests:
      - kubernetes/deployment.yaml
      - kubernetes/service.yaml
```

Create a folder named `kubernetes` and add `deployment.yaml` file.  
* Edit this file with `Ctrl`+`Space` and select `Kubernetes - Deployment` to generate a sample deployment
* Right click on `appname` and choose `Change all occurences` and change it to `myquarkusapp`
* edit the container image name to `gcr.io/PROJECTNAME/myquarkusapp:latest` to deploy the image that gets built in the build step

The resultant deployment file looks like this

```
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myquarkusapp-deployment
spec:
  selector:
    matchLabels:
      app: myquarkusapp
  template:
    metadata:
      labels:
        app: myquarkusapp
    spec:
      containers:
      - name: myquarkusapp
        image: gcr.io/veer-dil1/myquarkusapp:latest
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

In `kubernetes` folder create a file named `service.yaml` and edit it the same way like the previous one. 
*  `Ctrl`+`Space` and choose `Kubernetes -Service` template to generate code
* Replace all occurences of `appname` with `myquarkusapp`

The resultant `service.yaml` should look like

```
apiVersion: v1
kind: Service
metadata:
  name: myquarkusapp-service
spec:
  type: ClusterIP
  selector:
    app: myquarkusapp
  ports:
  - port: 3000
    targetPort: 8080
```

## Run the application in dev mode on Kubernetes

On the bottom status bar choose `Cloud Code`->`Run on Kubernetes`, and choose the context for your kubernetes cluster. 
* Watch the detailed logs in `Kubernetes: Run/Debug -Detailed` output view. The build takes a few mins for the first time as the container is built, as the pod is deployed and the maven dependencies are downloaded into the running container. In a few mins you will see the app deployed and listening

```
...
...
[myquarkusapp]2022-02-16 22:08:33,131 INFO  [io.qua.dep.QuarkusAugmentor] (main) Beginning quarkus augmentation
[myquarkusapp]2022-02-16 22:08:42,523 INFO  [io.qua.dep.QuarkusAugmentor] (main) Quarkus augmentation completed in 9392ms
[myquarkusapp]2022-02-16 22:08:44,720 INFO  [io.quarkus] (main) Quarkus 1.0.0.CR1 started in 13.386s. Listening on: http://0.0.0.0:8080
[myquarkusapp]2022-02-16 22:08:44,721 INFO  [io.quarkus] (main) Profile dev activated. Live Coding activated.
[myquarkusapp]2022-02-16 22:08:44,724 INFO  [io.quarkus] (main) Installed features: [cdi, resteasy]
```

* Switch over to the `Kubernetes: Run/Debug` output view and hover over the URL for local host URL and click on `Open Web Preview`

```
**************URLs*****************
Forwarded URL from service myquarkusapp-service: http://localhost:3001
Update succeeded
***********************************
```
This will open a new tab and show the running application.

* Remove the `?authuser=0` at the end of the URL for the running app in the new tab and add a `hello` extension. You will now see the output from the `GreetingResource.java`

## Hot Reloading changes into a container

* Switch back to the editor and open `src/main/java/org/acme/quickstart/GreetingResource.java` file
* Edit the code by replacing `return "hello";` with return "hello world!!";

As soon as this change is made you will see the following in the `Kubernetes: Run/Debug` output view

```
Update initiated
File sync started for 1 files for gcr.io/veer-dil1/myquarkusapp:latest@sha256:19286715e5f73aa80081102abfa7c27d299f3e0544b8264b0864fdb755d4e39d
File sync succeeded for 1 files for gcr.io/veer-dil1/myquarkusapp:latest@sha256:19286715e5f73aa80081102abfa7c27d299f3e0544b8264b0864fdb755d4e39d
Update succeeded
```

and in `Kubernetes: Run/Debug - Detailed` output view

```
files modified: [src/main/java/org/acme/quickstart/GreetingResource.java]
Copying files:map[src/main/java/org/acme/quickstart/GreetingResource.java:[/usr/src/app/src/main/java/org/acme/quickstart/GreetingResource.java]]togcr.io/veer-dil1/myquarkusapp:latest@sha256:19286715e5f73aa80081102abfa7c27d299f3e0544b8264b0864fdb755d4e39d
Syncing 1 files for gcr.io/veer-dil1/myquarkusapp:latest@sha256:19286715e5f73aa80081102abfa7c27d299f3e0544b8264b0864fdb755d4e39d
Watching for changes...
```

This indicates that the source code is now copied into the container. 

Now refresh the preview screen, the code will be immediately built and you will observe the code changes in your browser. You'll see the following output in the 
`Kubernetes: Run/Debug - Detailed` output view.

```
[myquarkusapp]2022-02-16 23:04:52,329 INFO  [io.qua.dev] (vert.x-worker-thread-3) Changed source files detected, recompiling [/usr/src/app/src/main/java/org/acme/quickstart/GreetingResource.java]
[myquarkusapp]2022-02-16 23:04:55,616 INFO  [io.quarkus] (vert.x-worker-thread-3) Quarkus stopped in 0.010s
[myquarkusapp]2022-02-16 23:04:55,620 INFO  [io.qua.dep.QuarkusAugmentor] (vert.x-worker-thread-3) Beginning quarkus augmentation
[myquarkusapp]2022-02-16 23:04:59,005 INFO  [io.qua.dep.QuarkusAugmentor] (vert.x-worker-thread-3) Quarkus augmentation completed in 3385ms
[myquarkusapp]2022-02-16 23:04:59,209 INFO  [io.quarkus] (vert.x-worker-thread-3) Quarkus 1.0.0.CR1 started in 3.592s. Listening on: http://0.0.0.0:8080
[myquarkusapp]2022-02-16 23:04:59,210 INFO  [io.quarkus] (vert.x-worker-thread-3) Profile dev activated. Live Coding activated.
[myquarkusapp]2022-02-16 23:04:59,211 INFO  [io.quarkus] (vert.x-worker-thread-3) Installed features: [cdi, resteasy]
[myquarkusapp]2022-02-16 23:04:59,213 INFO  [io.qua.dev] (vert.x-worker-thread-3) Hot replace total time: 6.886s 
```

Now it is all setup for hot reloading as you make changes.

## Debugging setup

You may have noticed that your application is already listening on port 5005 for debugging based on the output from pod logs in the `Kubernetes: Run/Debug - Detailed` output view

```
[myquarkusapp]Listening for transport dt_socket at address: 5005
```

Let us stop this thread first. Enter Debug view and stop the running thread.

In order to setup this application for debugging we need two things:
* Add an annotation to the pod (`spec.template.metadata.annotations`) to let kubernetes know that it is a debuggable container `debug.cloud.google.com/config: '{"myquarkusapp":{"runtime":"jvm","ports":{"jdwp":5005}}}'`

* Add an additional `spec.ports.containerPort=5005` to the deployment

The resultant deployment looks like this 

```
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myquarkusapp-deployment
spec:
  selector:
    matchLabels:
      app: myquarkusapp
  template:
    metadata:
      labels:
        app: myquarkusapp
      annotations:
        debug.cloud.google.com/config: '{"myquarkusapp":{"runtime":"jvm","ports":{"jdwp":5005}}}'
    spec:
      containers:
      - name: myquarkusapp
        image: gcr.io/veer-dil1/myquarkusapp:latest
        resources:
          requests:
            memory: "32Mi"
            cpu: "100m"
          limits:
            memory: "128Mi"
            cpu: "500m"
        ports:
        - containerPort: 8080
        - containerPort: 5005
```

Also the editor currently doesn't attach to debugger directly. As a temporary workaround, let us create a Java Debugger Attach to attach to port `5005`.

* Go to menu `Run`->`Add Configurations`-> choose `Java Attach`. A code snippet will be added to the `launch.json` file. Change the port value to `5005`. The resultant added snippet under `configurations` should look like this

```
        {
            "type": "java",
            "name": "Debug (Attach)",
            "request": "attach",
            "hostName": "localhost",
            "port": 5005
        },
```

We are now done with all configuration needed for debugging.

Now run the application on Kubernetes in Debug mode by choosing `Cloud Code`-> `Debug on Kubernetes` from the bottom status bar.

This time in the `Kubernetes: Run/Debug` output view you will notice that the debuggable container has started as below

```
**************URLs*****************
Forwarded URL from service myquarkusapp-service: http://localhost:3001
Update succeeded
Debuggable container started pod/myquarkusapp-deployment-66d84dd447-rqzxs:myquarkusapp (default)
***********************************
```

Make sure that the application is completely up by looking at the logs in the `Kubernetes: Run/Debug - Detailed` view.

Open `GreetingResource.java` file and set a breakpoint on the `return` statement.

Switch to Debug view, select `Debug Attach` from the menu and run it.

The bottom status line turns orange to indicate that the debugger has attached.

Now run the application in the browser to observe that the control stops at the breakpoint.

Your application is now debuggable.

You can now go to Debug view and stop the running thread.

## Summary

In this lab we have created a basic Quarkus application, added Dockerfile for running maven container in dev mode, added Skaffold for interactive application development with containers, added kubernetes manifests and setup application for debugging.

In the next lab we will look start using this setup to do application development and build a CRUD application. 




























