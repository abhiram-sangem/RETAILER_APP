package com.rt.inventory;

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
    private Double mrp; // --- NEW MRP FIELD ---
    private Double price;
    private Integer stock;

    public Product() {}

    public Product(String name, Double price, Integer stock) {
        this.name = name;
        this.price = price;
        this.stock = stock;
        this.purchasePrice = 0.0;
        this.mrp = price; // Default MRP to Selling Price
        this.hsnCode = "N/A";
    }

    public Product(String name, String hsnCode, Double purchasePrice, Double mrp, Double price, Integer stock) {
        this.name = name;
        this.hsnCode = hsnCode;
        this.purchasePrice = purchasePrice;
        this.mrp = mrp;
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

    public Double getMrp() { return mrp; }
    public void setMrp(Double mrp) { this.mrp = mrp; }

    public Double getPrice() { return price; }
    public void setPrice(Double price) { this.price = price; }

    public Integer getStock() { return stock; }
    public void setStock(Integer stock) { this.stock = stock; }
}