package com.rt;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
public class DataInitializer implements CommandLineRunner {

    @Autowired
    private ProductRepository productRepository;

    @Override
    public void run(String... args) throws Exception {
        if (productRepository.count() == 0) {
            // Adding products with Name, Price, AND initial Stock!
            productRepository.save(new Product("VESTS", 120.0, 50));
            productRepository.save(new Product("BRIEF", 320.0, 30));
            productRepository.save(new Product("SHIRT", 850.0, 15));
            productRepository.save(new Product("PANTS", 1000.0, 20));
        }
    }
}