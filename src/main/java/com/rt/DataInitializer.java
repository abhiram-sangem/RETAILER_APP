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
        // Add sample products if the database is empty
        if (productRepository.count() == 0) {
            productRepository.save(new Product("VEST", 100.0));
            productRepository.save(new Product("BRIEF", 150.0));
            productRepository.save(new Product("SHIRT", 50.0));
            productRepository.save(new Product("PANTS", 80.0));
            System.out.println("Sample products added to database!");
        }
    }
}
