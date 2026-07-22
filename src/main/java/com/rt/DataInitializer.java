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
            productRepository.save(new Product("Shirt", "6205", 250.0, 500.0, 20));
            productRepository.save(new Product("Pant", "6203", 400.0, 800.0, 15));
            productRepository.save(new Product("Shoes", "6403", 600.0, 1200.0, 10));
            productRepository.save(new Product("Jacket", "6201", 1000.0, 2000.0, 8));
        }
    }
}