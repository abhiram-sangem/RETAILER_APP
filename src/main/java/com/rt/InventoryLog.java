package com.rt;

import java.time.LocalDateTime;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;

@Entity
public class InventoryLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long productId;
    private String productName;
    private String actionType;
    
    // --- CHANGED TO DOUBLE ---
    private Double quantityChanged; 
    private Double finalStock;      
    
    private String description;
    private LocalDateTime timestamp;

    public InventoryLog() {}

    // --- CONSTRUCTOR UPDATED TO ACCEPT DOUBLE ---
    public InventoryLog(Long productId, String productName, String actionType, 
                        Double quantityChanged, Double finalStock, String description) {
        this.productId = productId;
        this.productName = productName;
        this.actionType = actionType;
        this.quantityChanged = quantityChanged;
        this.finalStock = finalStock;
        this.description = description;
        this.timestamp = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getProductId() { return productId; }
    public void setProductId(Long productId) { this.productId = productId; }

    public String getProductName() { return productName; }
    public void setProductName(String productName) { this.productName = productName; }

    public String getActionType() { return actionType; }
    public void setActionType(String actionType) { this.actionType = actionType; }

    public Double getQuantityChanged() { return quantityChanged; }
    public void setQuantityChanged(Double quantityChanged) { this.quantityChanged = quantityChanged; }

    public Double getFinalStock() { return finalStock; }
    public void setFinalStock(Double finalStock) { this.finalStock = finalStock; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public LocalDateTime getTimestamp() { return timestamp; }
    public void setTimestamp(LocalDateTime timestamp) { this.timestamp = timestamp; }
}