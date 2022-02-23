
# Spring Boot - Inner Loop development

In the previous lab, we learnt to setup a SprintBoot application for interactive inner loop development. In this lab, we will use the setup and add some code to build CRUD application

**NOTE:** The intent of this lab is not to teach the language, but to learn how the tooling we setup improves developer productivity.

## Prerequisites
* Basic application and interactive development setup from the [previous lab](./SpringBootInnerLoopSetup.md)
* [A database](./SetupCloudSQL.md) to connect this application code and test

## Add Maven extensions

Edit `pom.xml` and add the following to additional dependencies to the `<dependencies>` section.

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


## Add database connectivity configuration

Add a new folder `resources` in `src/main`. Add file `application.properties` with the properties required for SpringBoot to connect to a postgresql database.

```
spring.datasource.url= jdbc:postgresql://${DB_HOST:127.0.0.1}/${DB_DATABASE:item_db}
spring.datasource.username= ${DB_USER:user}
spring.datasource.password= ${DB_PASS:password}
spring.jpa.properties.hibernate.jdbc.lob.non_contextual_creation= true
spring.jpa.properties.hibernate.dialect= org.hibernate.dialect.PostgreSQLDialect
# Hibernate ddl auto (create, create-drop, validate, update)
spring.jpa.hibernate.ddl-auto= update
```

Edit the deployment in the `deployment.yaml` file to add the environment variables to supply the Database connectivity information. **Note** This connnection info is coming from the database we set up earlier in [this lab](./SetupCloudSQL.md). 

```
    spec:
      containers:
      - name: hello-java
        image: hello-java
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


## Add CRUD code

In this section we will add the CRUD code. You can write this code in portions with hot-reloading enabled or just copy paste this entire code, as per your convenience. The code below has intentional issues that you would want to debug using the skills  learnt earlier.

Create an Entity class `src/main/java/com/example/springboot/Item.Java` and add this code.

```
package com.example.springboot;

import java.math.BigDecimal;

import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;

@Entity
public class Item {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private long id;
    @Column(name = "item_name")
    private String itemName;
    @Column(name = "item_price")
    private BigDecimal itemPrice;

    public Item(String itemName, BigDecimal itemPrice) {
        this.itemName = itemName;
        this.itemPrice = itemPrice;
    }

    public long getId() {
        return id;
    }

    public void setId(long id) {
        this.id = id;
    }

    public String getItemName() {
        return itemName;
    }

    public void setItemName(String itemName) {
        this.itemName = itemName;
    }

    public BigDecimal getItemPrice() {
        return itemPrice;
    }

    public void setItemPrice(BigDecimal itemPrice) {
        this.itemPrice = itemPrice;
    }

    @Override
    public String toString() {
        return "Item [id=" + id + ", itemName=" + itemName + ", itemPrice=" + itemPrice + "]";
    }  
}

```

Create a repository file that extends JpaRepository `src/main/java/com/example/springboot/ItemRepository.java`. To keep it simple, we will not be implementing any custom code in this lab.

```
package com.example.springboot;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface ItemRepository extends JpaRepository<Item, Long> {
    
    //Custom finders
    //List<Item> findByNameContaining(String itemName);
    
}
```

Create a controller named ItemController that provides main functionality of this server in `src/main/java/com/example/springboot/ItemController.java`:

```
package com.example.springboot;

import java.util.ArrayList;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class ItemController {

    @Autowired
    ItemRepository itemRepository;

    @GetMapping("/items")
    public ResponseEntity<List<Item>> getAllItems() {
        try {
        List<Item> items = new ArrayList<Item>();
        itemRepository.findAll().forEach(items::add);
        if (items.size()==0 || items.isEmpty()) return new ResponseEntity<>(HttpStatus.NO_CONTENT);
        return new ResponseEntity<>(items, HttpStatus.OK);
        } catch (Exception e) {
			return new ResponseEntity<>(null, HttpStatus.INTERNAL_SERVER_ERROR);
		}
    }

    @PostMapping("/items")
    public ResponseEntity<Item> createItem(@RequestBody Item item) {
            try {
                Item _item = itemRepository.save(new Item(item.getItemName(), item.getItemPrice()));
                return new ResponseEntity<>(_item, HttpStatus.CREATED);
            } catch (Exception e) {
                return new ResponseEntity<>(null, HttpStatus.INTERNAL_SERVER_ERROR);
            }
        } 

}
```

## Test

Run the application on Kubernetes with `Cloud Code`-> `Run/Debug on Kubernetes`. Note the URL provided in the `Kubernetes: Run/Debug` view and assign it to a variable `URL`.

Post a couple of records. You can use a tool like httpie as shown below.

```
http POST $URL/items itemName="Body Spray" itemPrice=3.2
http POST $URL/items itemName="Nail Cutter" itemPrice=2.5
```

Now test the GET by running the `$URL/items` in the browser. It fails and no items are returned.

## Identify and fix the issue
Restart the application in Debug mode and find the issue. Here are some tips:
* We know something is wrong with the GET as it is not returning the desired result. So you would set breakpoint in `ItemController.getAllItems()` method.
* Run step by step execution and watch the variables at each step to observe the values, compare against your expectations
* If there are any exceptions, determine the reason

Once you identify the issue, get out of the debug mode, run the code normally and make necessary code changes.

The issue is in the `Item.java` entity file and the final corrected file should look like this.

```
package com.example.springboot;

import java.math.BigDecimal;

import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;

@Entity
public class Item {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private long id;
    @Column(name = "item_name")
    private String itemName;
    @Column(name = "item_price")
    private BigDecimal itemPrice;

    public Item() {
    }

    public Item(String itemName, BigDecimal itemPrice) {
        this.itemName = itemName;
        this.itemPrice = itemPrice;
    }

    public long getId() {
        return id;
    }

    public void setId(long id) {
        this.id = id;
    }

    public String getItemName() {
        return itemName;
    }

    public void setItemName(String itemName) {
        this.itemName = itemName;
    }

    public BigDecimal getItemPrice() {
        return itemPrice;
    }

    public void setItemPrice(BigDecimal itemPrice) {
        this.itemPrice = itemPrice;
    }

    @Override
    public String toString() {
        return "Item [id=" + id + ", itemName=" + itemName + ", itemPrice=" + itemPrice + "]";
    }   
}
```

Test again with http POST and GET methods.

## Add rest of the code

Just for completeness add the update and delete  methods to complete CRUD operation to the `ItemController.java`

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

## Test the code

Test the delete and update methods you just added

### Delete test
```
http DELETE $URL/items/3
```
Verify changes by running GET again

### Update Test

```
http PUT $URL/items/2 itemName="Nail Cutter" itemPrice=3.5
```

Verify changes by running GET again

## Summary

Congratulations! In this lab you practiced and perfected your hot reloading and debugging skills while building a Spring Boot CRUD application.






