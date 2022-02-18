# Quarkus - Inner loop development 

In the previous lab, we have learnt to setup quarkus application for interactive inner loop development. In this lab, we will use this setup to add some code to build a CRUD application.

**NOTE:** The intent of this lab is not to teach the language, but how the tooling we are using improves your productivity.

## Prerequisites

* Basic application and interactive development setup from the previous lab
* A database to connect this application code and test

## Add maven extensions

* Add maven extensions for panache and postgresql

```
mvn quarkus:add-extension -Dextension="quarkus-hibernate-orm-panache, quarkus-jdbc-postgresql, quarkus-resteasy, quarkus-resteasy-jackson"
```

This will change `pom.xml` file.


## Add CRUD code

* Add properties to the `src/main/resources/application.properties` file which allows connects your dev application to the database

```
quarkus.hibernate-orm.database.generation=drop-and-create
quarkus.hibernate-orm.log.format-sql=true
quarkus.hibernate-orm.log.sql=true
quarkus.hibernate-orm.sql-load-script=import.sql

quarkus.datasource.driver=org.postgresql.Driver
quarkus.datasource.db-kind=postgresql
%dev.quarkus.datasource.username=${DB_USER:user}
%dev.quarkus.datasource.password=${DB_PASS:password}
%dev.quarkus.datasource.jdbc.url=jdbc:postgresql://${DB_HOST:mytest-instance}/${DB_DATABASE:item-db}
```

* Add a new file in directory `src/main/java/org/acme/quickstart` with name `Item.java` as an Entity class. Type the following code if you want to learn features built into Cloud Code. You can start with `Ctrl`+`Space` to select a `class`.

```
package org.acme.quickstart;

import java.math.BigDecimal;
import javax.persistence.Column;
import javax.persistence.Entity;
import io.quarkus.hibernate.orm.panache.PanacheEntity;

/**
 * Item
 */
@Entity
public class Item extends PanacheEntity{

    @Column(name="item_name")
    public String itemName;
    @Column(name="item_price")
    public BigDecimal itemPrice;
    
}
```

* Add `src/main/resources/import.sql` file with a few insert statements.

```
insert into item(id, item_name, item_price) values (nextval('hibernate_sequence'), 'Tennis Ball', 0.5);
insert into item(id, item_name, item_price) values (nextval('hibernate_sequence'), 'Baseball Cap', 9);
insert into item(id, item_name, item_price) values (nextval('hibernate_sequence'), 'Yoga Mat', 12.40);
```

* Add another new file in directory `src/main/java/org/acme/quickstart` with name `ItemResource.java` that implements CRUD operations on this entity. We will add these operations one at a time. Let us start with the `GET` operation.

```
package org.acme.quickstart;

import java.util.List;

import javax.ws.rs.Consumes;
import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.core.MediaType;

import io.quarkus.panache.common.Sort;

/**
 * ItemResource
 */

@Path ("/item")
@Consumes(MediaType.APPLICATION_JSON)
@Produces(MediaType.APPLICATION_JSON)
public class ItemResource {

    @GET
    public List<Item> getAll() throws Exception {

        return Item.findAll(Sort.ascending("item_name")).list();
        
    }  
}
```

* Edit the `deployment.yaml` file to include environment variables that import the database credentials from the kubernetes secret created in the past. Replace the DB_HOST value with the Private IP of the database instance created earlier.

```
        ports:
        - containerPort: 8080
        - containerPort: 5005
        env:
        - name: DB_HOST
          value: "127.0.0.1"
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





