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
    private String actionType; // SALE, PURCHASE, RETURN, MANUAL_UPDATE
    private Integer quantityChanged;
    private Integer finalStock;
    private String description;
    private LocalDateTime timestamp;

    public InventoryLog() {}

    public InventoryLog(Long productId, String productName, String actionType, Integer quantityChanged, Integer finalStock, String description) {
        this.productId = productId;
        this.productName = productName;
        this.actionType = actionType;
        this.quantityChanged = quantityChanged;
        this.finalStock = finalStock;
        this.description = description;
        this.timestamp = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public Long getProductId() { return productId; }
    public String getProductName() { return productName; }
    public String getActionType() { return actionType; }
    public Integer getQuantityChanged() { return quantityChanged; }
    public Integer getFinalStock() { return finalStock; }
    public String getDescription() { return description; }
    public LocalDateTime getTimestamp() { return timestamp; }
}