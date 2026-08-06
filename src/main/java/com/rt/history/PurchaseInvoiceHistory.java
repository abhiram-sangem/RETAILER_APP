package com.rt.history;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;

@Entity
public class PurchaseInvoiceHistory {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long originalPurchaseInvoiceId;
    private String sellerName;
    private LocalDateTime editDate;

    @Column(columnDefinition = "TEXT")
    private String oldItemsJson;

    @Column(columnDefinition = "TEXT")
    private String newItemsJson;

    private Double oldFinalTotal;
    private Double newFinalTotal;

    public PurchaseInvoiceHistory() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getOriginalPurchaseInvoiceId() { return originalPurchaseInvoiceId; }
    public void setOriginalPurchaseInvoiceId(Long originalPurchaseInvoiceId) { this.originalPurchaseInvoiceId = originalPurchaseInvoiceId; }
    public String getSellerName() { return sellerName; }
    public void setSellerName(String sellerName) { this.sellerName = sellerName; }
    public LocalDateTime getEditDate() { return editDate; }
    public void setEditDate(LocalDateTime editDate) { this.editDate = editDate; }
    public String getOldItemsJson() { return oldItemsJson; }
    public void setOldItemsJson(String oldItemsJson) { this.oldItemsJson = oldItemsJson; }
    public String getNewItemsJson() { return newItemsJson; }
    public void setNewItemsJson(String newItemsJson) { this.newItemsJson = newItemsJson; }
    public Double getOldFinalTotal() { return oldFinalTotal; }
    public void setOldFinalTotal(Double oldFinalTotal) { this.oldFinalTotal = oldFinalTotal; }
    public Double getNewFinalTotal() { return newFinalTotal; }
    public void setNewFinalTotal(Double newFinalTotal) { this.newFinalTotal = newFinalTotal; }
}