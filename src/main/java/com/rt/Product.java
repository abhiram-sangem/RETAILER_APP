package com.rt;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;

@Entity
public class Product {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;
    private String hsnCode;
    private Double purchasePrice;
    private Double price;
    private Integer stock;

    // 1. Default no-argument constructor (Required by JPA)
    public Product() {}

    // 2. Legacy Constructor matching old DataInitializer calls: (name, price, stock)
    public Product(String name, Double price, Integer stock) {
        this.name = name;
        this.price = price;
        this.stock = stock;
        this.purchasePrice = 0.0;
        this.hsnCode = "N/A";
    }

    // 3. Full Constructor: (name, hsnCode, purchasePrice, price, stock)
    public Product(String name, String hsnCode, Double purchasePrice, Double price, Integer stock) {
        this.name = name;
        this.hsnCode = hsnCode;
        this.purchasePrice = purchasePrice;
        this.price = price;
        this.stock = stock;
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getHsnCode() { return hsnCode; }
    public void setHsnCode(String hsnCode) { this.hsnCode = hsnCode; }

    public Double getPurchasePrice() { return purchasePrice; }
    public void setPurchasePrice(Double purchasePrice) { this.purchasePrice = purchasePrice; }

    public Double getPrice() { return price; }
    public void setPrice(Double price) { this.price = price; }

    public Integer getStock() { return stock; }
    public void setStock(Integer stock) { this.stock = stock; }
}