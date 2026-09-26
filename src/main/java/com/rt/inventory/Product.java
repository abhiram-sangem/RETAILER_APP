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
    private Double mrp; 
    private Double price;
    
    // --- CHANGED TO DOUBLE FOR FRACTIONAL STOCK ---
    private Double stock;

    // --- NEW PIECE PRICING FIELDS ---
    private Integer piecesPerBox;
    private Double piecePurchasePrice;
    private Double pieceMrp;
    private Double piecePrice;

    public Product() {}

    public Product(String name, Double price, Double stock) {
        this.name = name;
        this.price = price;
        this.stock = stock;
        this.purchasePrice = 0.0;
        this.mrp = price; 
        this.hsnCode = "N/A";
    }

    public Product(String name, String hsnCode, Double purchasePrice, Double mrp, Double price, Double stock, Integer piecesPerBox) {
        this.name = name;
        this.hsnCode = hsnCode;
        this.purchasePrice = purchasePrice;
        this.mrp = mrp;
        this.price = price;
        this.stock = stock;
        this.piecesPerBox = piecesPerBox;
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

    public Double getStock() { return stock; }
    public void setStock(Double stock) { this.stock = stock; }

    public Integer getPiecesPerBox() { return piecesPerBox; }
    public void setPiecesPerBox(Integer piecesPerBox) { this.piecesPerBox = piecesPerBox; }

    public Double getPiecePurchasePrice() { return piecePurchasePrice; }
    public void setPiecePurchasePrice(Double piecePurchasePrice) { this.piecePurchasePrice = piecePurchasePrice; }

    public Double getPieceMrp() { return pieceMrp; }
    public void setPieceMrp(Double pieceMrp) { this.pieceMrp = pieceMrp; }

    public Double getPiecePrice() { return piecePrice; }
    public void setPiecePrice(Double piecePrice) { this.piecePrice = piecePrice; }
}