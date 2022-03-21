package com.example.springboot;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface ItemRepository extends JpaRepository<Item, Long> {
    
    //Custom finders
    //List<Item> findByNameContaining(String itemName);
    
}
