package com.rt;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;

@Entity
public class InvoiceHistory {
    @Id 
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    private Long originalInvoiceId;
    private String customerName;
    
    private Double oldFinalTotal;
    private Double newFinalTotal; // Added to compare totals
    
    // Storing the cart snapshots as JSON text to easily compare in React
    @Column(columnDefinition = "TEXT")
    private String oldItemsJson; 
    
    @Column(columnDefinition = "TEXT")
    private String newItemsJson; 
    
    private LocalDateTime editDate;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    
    public Long getOriginalInvoiceId() { return originalInvoiceId; }
    public void setOriginalInvoiceId(Long originalInvoiceId) { this.originalInvoiceId = originalInvoiceId; }
    
    public String getCustomerName() { return customerName; }
    public void setCustomerName(String customerName) { this.customerName = customerName; }
    
    public Double getOldFinalTotal() { return oldFinalTotal; }
    public void setOldFinalTotal(Double oldFinalTotal) { this.oldFinalTotal = oldFinalTotal; }
    
    public Double getNewFinalTotal() { return newFinalTotal; }
    public void setNewFinalTotal(Double newFinalTotal) { this.newFinalTotal = newFinalTotal; }

    public String getOldItemsJson() { return oldItemsJson; }
    public void setOldItemsJson(String oldItemsJson) { this.oldItemsJson = oldItemsJson; }

    public String getNewItemsJson() { return newItemsJson; }
    public void setNewItemsJson(String newItemsJson) { this.newItemsJson = newItemsJson; }
    
    public LocalDateTime getEditDate() { return editDate; }
    public void setEditDate(LocalDateTime editDate) { this.editDate = editDate; }
}