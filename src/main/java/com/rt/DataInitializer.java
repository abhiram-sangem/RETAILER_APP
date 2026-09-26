package com.rt; 

import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import com.rt.inventory.Product;
import com.rt.inventory.ProductRepository;

@Configuration
public class DataInitializer {

    @Bean
    public CommandLineRunner loadData(ProductRepository productRepository) {
        return args -> {
            // Only initialize if the database is completely empty
            if (productRepository.count() == 0) {
                
                // NEW CONSTRUCTOR: Product(name, hsnCode, purchasePrice, mrp, price, stock (Double), piecesPerBox (Integer))
                
                // Example 1: Standard item sold only in whole quantities (piecesPerBox = 0)
                productRepository.save(new Product(
                    "Cotton Shirt", "6205", 
                    350.0, 599.0, 500.0, 
                    50.0, 0 
                ));

                // Example 2: Boxed item sold in fractions (e.g., 10 pieces per box)
                Product vestBox = new Product(
                    "Dixcy Scott Vest (Box)", "6109", 
                    400.0, 600.0, 550.0, 
                    20.0, 10 
                );
                // Set the individual piece pricing for the fractional items
                vestBox.setPiecePurchasePrice(40.0);
                vestBox.setPieceMrp(60.0);
                vestBox.setPiecePrice(55.0);
                productRepository.save(vestBox);

                // Example 3: Another standard item
                productRepository.save(new Product(
                    "Denim Jeans", "6203", 
                    600.0, 999.0, 850.0, 
                    30.0, 0 
                ));

                System.out.println("✅ Database Initialized with Fractional-Ready Products!");
            }
        };
    }
}