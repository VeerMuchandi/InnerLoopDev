# Developer Productivity with Cloud Code, Skaffold and GKE

This is a shortened 20 min demo script of interactive development of Spring Boot CRUD application using Cloud Code.

## Prerequisites
* A Kubernetes cluster
* Registry setup (I am using gcr.io) in the same project as the kubernetes cluster. Otherwise, you will have to setup access for K8S cluster to access the images.
* A workstation with editor (Cloud Workstation, Cloud Shell Editor or VS Code ) with Cloud Code extension, Java Extension Pack (`Extension Pack for Java  v0.22.0 `) installed
* Workstation is connected to gcloud and kubeconfig is set to the Kubernetes cluster
* A Postgresql database is running on CloudSQL or Cloud Spanner and the secrets are created with the connection information.


## Clone Base Spring Boot App with Jib Configuration 

This repository has `skaffold.yaml` with Jib based build, kubernetes `deployment.yaml`, and `pom.xml` preconfigured with Jib and maven dependencies.

```
git clone https://github.com/VeerMuchandi/sbhelloword-hotreload
```
The above step will add a folder with name `sbhelloword-hotreload`. In the editor's explorer view, open this folder as a workspace.

## Walk through Configurations

In the interest of time, the base spring boot application has been cloned and following configurations are added to get the application ready interactive application development with hot-reloading with Cloud Code.

### Maven configuration

Open`pom.xml` file to notice the following maven configurations were added
* three plugins for `maven`, `maven-resources` and `jib`

```
        <plugins>
			<plugin>
				<groupId>org.springframework.boot</groupId>
				<artifactId>spring-boot-maven-plugin</artifactId>
			</plugin>
            <plugin>
                <groupId>com.google.cloud.tools</groupId>
                <artifactId>jib-maven-plugin</artifactId>
                <version>2.8.0</version>
            </plugin>
	    <plugin>
				<groupId>org.apache.maven.plugins</groupId>
				<artifactId>maven-resources-plugin</artifactId>
				<version>3.1.0</version>
	    </plugin> 
		</plugins>
```

* Profile `sync` is setup 

```
        <profile>
        <id>sync</id>
        <dependencies>
            <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-devtools</artifactId>
            </dependency>
        </dependencies>
        </profile
```


### Skaffold 

Open `skaffold.yaml` to observe 
* Build configured to use Jib. Note the image name.
* Uses `sync` profile
* `auto: true` set for sync. This hot reloads the code into the container.
* Note the `deploy` to kubernetes happens through `deployment.yaml` file. 

```
apiVersion: skaffold/v2beta27
kind: Config
metadata:
  name: complete
build:
  artifacts:
  - image: myspringbootapp
    jib:
      project: com.example:spring-boot-complete
      type: maven
      args: 
      - --no-transfer-progress
      - -Psync
      - -DskipTests
      fromImage: gcr.io/distroless/java:debug
    sync:
      auto: true
deploy:
  kubectl:
    manifests:
    - deployment.yaml
portForward:
- resourceType: service
  resourceName: myspringbootapp
  port: 8080
```

### Kubernetes Manifests

Finally, look at the kubernetes manifests in the `deployment.yaml` file to notice that it deploys a k8s deployment and a k8s service.


## Test Hot reloading

### Deploy application

* Press `F1` and choose `Cloud Code: Run on Kubernetes`.
* Choose your GKE cluster
* Choose image registry when it prompts within the same namespace as the kubernetes cluster. 
* This will build and deploy the application using Jib into the GKE cluster.
* * Watch the `Kubernetes Run/Debug` in the `Output` view for summarized logs. This output will provide a localhost url to access the application once it is deployed. Also note that the deployment is in watch mode and it is `Watching for changes...`
* * Also watch `Kubernetes Run/Debug - Detailed` in the `Output` view for detailed logs that show skaffold runs build,how Jib creates a container image, and deploys to K8S cluster. After the application deploys as a pod, notice the pod logs are streamed to this view. Also notice Spring Boot starting up and class loading. 

Access the application by `Follow link` on the URL displayed in the `Kubernetes Run/Debug` view

Watch the output that shows `Greetings from Spring Boot!` in the browser.

### Code changes

* The source code is in `src/main/java/com/example/springboot/HelloController.java`. Navigate through explorer view and open the file and view the code.
* Make a small change the hello message. Let us say `Hello from Spring Boot!` and get to a different line in the code
* As soon as you make these changes, in the `Output` view you will notice that the files are synced to the container
```
File sync started for 1 files
```
* In the `Kubernetes Run/Debug - Detailed` view you will notice that the spring boot inside the container restarts
* Test the URL again and you will notice that new message.

**NOTE**: The container is not rebuilt, and it is not redeployed. The code changes are directly synced from the source code into the container and they are immediately available for testing. This is significantly fast and brings down the innerloop cycle time from minutes to seconds.

Stop the running application by pressing `Shift+F5`. This can also be stopped by navigating to the run control and pressing the stop button.

## Adding CRUD code

In this section we will add some real CRUD code to our application.

### Configuration changes

* Change `pom.xml` file to include database dependencies

```
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-data-jpa</artifactId>
        </dependency>

        <dependency>
            <groupId>org.postgresql</groupId>
            <artifactId>postgresql</artifactId>
            <scope>runtime</scope>
        </dependency>
```

Select `Now` when it asks `A build file was modified. Do you want to synchronize the Java classpath/configuration?`

* Add database connectivity configuration. 

* * Create a new folder `src/main/resources`
* * Create a new file `src/main/resources/application.properties` and add the following content
```
spring.datasource.url= jdbc:postgresql://${DB_HOST:127.0.0.1}/${DB_DATABASE:item_db}
spring.datasource.username= ${DB_USER:user}
spring.datasource.password= ${DB_PASS:password}
spring.jpa.properties.hibernate.jdbc.lob.non_contextual_creation= true
spring.jpa.properties.hibernate.dialect= org.hibernate.dialect.PostgreSQLDialect
# Hibernate ddl auto (create, create-drop, validate, update)
spring.jpa.hibernate.ddl-auto= update
```
**NOTE** The properties refer environment variables whose values will be passed in via k8s manifests.

* Update K8S deployment to pass parameters to connect to the database. Substitute the IP address of the database.

```
    spec:
      containers:
      - name: myspringbootapp
        image: myspringbootapp
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

### Add code
* Download `springboot-crudcode` folder to your local machine. It contains three files 
* *  Entity `Item.java`
* *  Repository `ItemRepository.java` and
* *  Controller `ItemController.java` 

* Upload these files to `src/main/java/com/example/springboot` in the workspace
* Notice that as soon as you upload there are some errors in `ItemController.java`. These are intentionally introduced errors to show how the editor's context senstive help can help you identify and fix issues. Right click on these errors and apply `Quick fixes` to import the dependencies `java.util.List` and `java.util.ArrayList`. 

## Test and Debug

### Redeploy the application

* This time we will deploy the application with `F1` -> `Cloud Code - Debug on Kubernetes` option. Note we are using `Debug on Kubernetes` instead of `Run on Kubernetes` here as we want to connect to the debugger this time. 

* As the application gets built and deployed notice the logs in the `Output` -> `Kubernetes Run/Debug` and `Kubernetes Run/Debug - Detailed` views. 

* This time notice the message `Debuggable container started pod/myspringbootapp-xxxxxxxxxx` and the status bar turns orange.

### Test

Note the URL provided in the `Kubernetes: Run/Debug` view and assign it to a variable URL in the terminal.

Post a couple of records. You can use a tool like httpie as shown below.

```
curl -X POST $URL/items -d '{"itemName":"Body Spray", "itemPrice":3.2}' -H "Content-Type: application/json"
curl -X POST $URL/items -d '{"itemName":"Nail Cutter", "itemPrice":2.5}' -H "Content-Type: application/json"
```

Now test the GET by running the $URL/items in the browser. It fails and no items are returned.

Let us debug why this application fails.

### Debug

* We know `ItemController.java` is the controller class. Open the file and note the `@GetMapping` in the method `getAllItems`. Put a breakpoint on the first line inside the `try` block. This is where a list is created.
* Refresh the browser and the control waits on the browser. Navigate back to the code and see the code execution stops at the breakpoint.
* Run step-by-step execution to notice there is an exception at the database call. Look at the actual exception detailed message in the variables view `"No default constructor for entity:  : com.example.springboot.Item"`. It clearly indicates that the default constructor is missing.
* Remove the breakpoint that you added earlier. Press on the `Continue` or `F5` button to release the control from debugger. 
* Open the `Item.java` and notice that there is no default constructor. Add it

```
    public Item() {
        
    }
```

* As soon as you add the code the files are synced. Once spring boot restarts (in the detailed logs), test the `$URL/items` again the browser. This time you should see both the items

```
[{"id":3,"itemName":"Body Spray","itemPrice":3.20},{"id":4,"itemName":"Nail Cutter","itemPrice":2.50}]
```

* Add rest of the code to complete the CRUD application

```
        @PutMapping("/items/{id}")
        public ResponseEntity<Item> updateTutorial(@PathVariable("id") long id, @RequestBody Item item) {
            Optional<Item> itemData = itemRepository.findById(id);
            if (itemData.isPresent()) {
                Item _item = itemData.get();
                _item.setItemName(item.getItemName());
                _item.setItemPrice(item.getItemPrice());
                return new ResponseEntity<>(itemRepository.save(_item), HttpStatus.OK);
            } else {
                return new ResponseEntity<>(HttpStatus.NOT_FOUND);
            }
        }
        @DeleteMapping("/items/{id}")
        public ResponseEntity<HttpStatus> deleteItem(@PathVariable("id") long id) {
            try {
                itemRepository.deleteById(id);
                return new ResponseEntity<>(HttpStatus.NO_CONTENT);
            } catch (Exception e) {
                return new ResponseEntity<>(HttpStatus.INTERNAL_SERVER_ERROR);
            }
        }
```
* Fix the dependencies

* Once the files are synced, delete the records that were added before and delete the two items by running (substitute ID)

```
curl -X DELETE $URL/items/[ID]
```

## Summary 

In this short demo, we showed:
- Using Jib to build spring boot java containers without knowing Docker
- Using Skaffold for hot deployment and interactive container development
- Debugging connecting to running containers
- Integrating with cloud based database from the running container during developer's inner loop 

We have learnt how these technologies together make container based application development super fast










