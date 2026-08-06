package com.rt.customers;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CustomerRepository extends JpaRepository<Customer, Long> {
    // This exact line is what the controller was crying about!
    List<Customer> findByName(String name);
}