# SpringBoot App Inner Loop Setup

In this lab, we will learn to setup tooling for inner loop container application development of Spring Boot application.

## Prerequisites

* An editor with Cloud Code such as Cloud Shell Editor or VS Code with Cloud Code extension
* A Kubernetes cluster such as minikube running locally or a GKE cluster configured to use with Cloud Code

## Create a SpringBoot Application

Git clone a simple starter application code.

```
git clone https://github.com/spring-guides/gs-spring-boot.git
```

This will create a new folder namd `gs-spring-boot`.

In the explorer view, navigate to `gs-spring-boot/complete`, right click and choose `Open as Workspace`

## Explore code

Once the workspace opens up, navigate the folder structure in the `Explorer`. You'll notice:

* Source code is in the `src` folder. `src/main/java/com/example/springboot/HelloController.java` is a simple application that displays a greeting.
* This plain springboot code has no container specific code. We will containerize and deploy it.
* You can build this code using `mvn` or `gradle`. In this example, we will use `maven`. Locate `pom.xml` file at the root of this workspace.

 
## Setup build mechanism with Skaffold and Jib

Edit `pom.xml` file and add the following plugin code snippet in the plugin's section

```
            <plugin>
                <groupId>com.google.cloud.tools</groupId>
                <artifactId>jib-maven-plugin</artifactId>
                <version>2.8.0</version>
            </plugin>
```

Open a terminal and run the following command to initialize skaffold, generate kubernetes manifests and setup build using Jib.

```
skaffold init --generate-manifests --XXenableJibInit
```
* Choose `Jib Maven Plugin`
`[Use arrows to move, space to select, <right> to all, <left> to none, type to filter]`
* Type in port `8080` to port-forward to 
* `y` to write the generated configurations and manifests.

The above step generates a `skaffold.yaml` file and a `deployment.yaml` file. All artifacts are named `pom-xml-image` by default. We need to edit them.

Open the `skaffold.yaml` file
* Select the image name currently sent as `pom-xml-image`. 
* Right click and choose `Change All Occurences`  
* Type in the new name as `myspringbootapp`

Similary, open `deployment.yaml` file and change all occurences of `pom-xml-image` to `myspringbootapp`. Notice that this file has two manifests:
* a kubernetes deployment that deploys a pod with the container image 
* a kubernetes service that front ends the pod

Back to editing `pom.xml` file. Add the following `profiles` section.

```
    <profiles>
        <profile>
        <id>sync</id>
        <dependencies>
            <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-devtools</artifactId>
            </dependency>
        </dependencies>
        </profile>
    </profiles>
```

Edit the build section in `skaffold.yaml` set up auto sync of your source code from the editor to the running container. The `build` section should look like the snippet below.

```
build:
  artifacts:
  - image: myspringbootapp
    jib:
      project: com.example:spring-boot-complete
      type: maven
      args: 
      - --no-transfer-progress
      - -Psync
      fromImage: gcr.io/distroless/java:debug
    sync:
      auto: true
```
* `type: maven` , `args` `fromImage: gcr.io/distroless/java:debug` added to the jib section
* `sync.auto: true` is added

## Run the application in Dev mode on Kubernetes

Press `F1` to bring up top menu. Choose `Cloud Code: Run on Kubernetes`. Skaffold will start to build and deploy the application on the Kubernetes cluster in `dev` mode. 

In the `Output` window, switch to `Kubernetes: Run/Debug - Detailed View` and watch the logs that are streamed in this view:
* Jib will be used to build springboot app and to containerize it
* Container created with name `gcr.io/PROJECTNAME/myspringbootapp` 
* Container will be deployed as a kubernetes pod and a service is created
* The pod logs will be streamed to show the springboot application coming up.

Switch back to `Kubernetes: Run/Debug` view in the `Output` window. You'll see 

```
**************URLs*****************
Forwarded URL from service myspringbootapp: http://localhost:8080
Update succeeded
***********************************
```
Hover over this URL and click on `Open Web Preview`.

The application opens up in a new browser tab and a simple greeting is displayed

```
Greetings from Spring Boot!
```

## Test Hot Reloading

Navigate to `src/main/java/com/example/springboot/HelloController.java`. Edit the code the greeting message from `return "Greetings from Spring Boot!";` to `return "Hello World!";`

Notice immediately that in the `Output` window, `Kubernetes: Run/Debug` view, the watcher syncs the updated files with the container in Kubernetes

```
Update initiated
File sync started for 2 files for gcr.io/veer-dil1/myspringbootapp:2.1.6.RELEASE-40-g4ad7b14-dirty@sha256:7bb8c7847383f35376abe63b331060a9e83c40a14f44acc41caa836f8bd23dc2
File sync succeeded for 2 files for gcr.io/veer-dil1/myspringbootapp:2.1.6.RELEASE-40-g4ad7b14-dirty@sha256:7bb8c7847383f35376abe63b331060a9e83c40a14f44acc41caa836f8bd23dc2
Update succeeded
```

If you switch to `Kubernetes: Run/Debug - Detailed` view, you will notice that the class files are copied and spring boot will restart in the container.

```
Syncing 2 files for gcr.io/veer-dil1/myspringbootapp:2.1.6.RELEASE-40-g4ad7b14-dirty@sha256:7bb8c7847383f35376abe63b331060a9e83c40a14f44acc41caa836f8bd23dc2
Copying files:map[/home/admin_/gs-spring-boot/complete/target/classes/com/example/springboot/Application.class:[/app/classes/com/example/springboot/Application.class] /home/admin_/gs-spring-boot/complete/target/classes/com/example/springboot/HelloController.class:[/app/classes/com/example/springboot/HelloController.class]]togcr.io/veer-dil1/myspringbootapp:2.1.6.RELEASE-40-g4ad7b14-dirty@sha256:7bb8c7847383f35376abe63b331060a9e83c40a14f44acc41caa836f8bd23dc2
atching for changes...
[myspringbootapp]
[myspringbootapp]  .   ____          _            __ _ _
[myspringbootapp] /\\ / ___'_ __ _ _(_)_ __  __ _ \ \ \ \
[myspringbootapp]( ( )\___ | '_ | '_| | '_ \/ _` | \ \ \ \
[myspringbootapp] \\/  ___)| |_)| | | | | || (_| |  ) ) ) )
[myspringbootapp]  '  |____| .__|_| |_|_| |_\__, | / / / /
[myspringbootapp] =========|_|==============|___/=/_/_/_/
[myspringbootapp] :: Spring Boot ::                (v2.6.3)
[myspringbootapp]
[myspringbootapp]2022-02-22 18:04:21.913  INFO 1 --- [  restartedMain] com.example.springboot.Application       : Starting Application using Java 11.0.14 on myspringbootapp-97b64cb-9gbj8 with PID 1 (/app/classes started by root in /)
...
...
```

Refresh the browser tab to notice the changes to the greeting message.

Make an additional code changes to observe how the speed of development improves with hot reloading.

* Rather than returning the message directly we will return a String variable

```
        String message = "Hello World!!";
		return message;
```

Test the results.

## Debugging

Go to the Debug view and stop the current thread.

Click on `Cloud Code` in the bottom menu and select `Debug on Kubernetes` to run the application in `debug` mode.
* In the `Kubernetes Run/Debug - Detailed` view of `Output` window, notice that skaffold will deploy this application in debug mode.
* It will take a couple of mins for the application to build and deploy.
* The bottom status bar changes its color from blue to orange indicating that it is in Debug mode.
* In the `Kubernetes Run/Debug` view, notice that a Debuggable container is started
```
**************URLs*****************
Forwarded URL from service myspringbootapp: http://localhost:8080
Update succeeded
Debuggable container started pod/myspringbootapp-8b564854b-l689l:myspringbootapp (default)
***********************************
```


Navigate to `src/main/java/com/example/springboot/HelloController.java`.
* Click on the left side of the number line to set a breakpoint at this statement `String message = "Hello World!!";`. Breakpoint is indicated by a red dot towards the left of the line number.
* Switch to Debug view and notice the two threads and breakpoints tab has `HelloController.java` listed

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














