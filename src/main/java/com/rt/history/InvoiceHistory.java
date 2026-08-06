package com.rt.history;

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
    private LocalDateTime editDate;

    @Column(columnDefinition = "TEXT")
    private String oldItemsJson;

    @Column(columnDefinition = "TEXT")
    private String newItemsJson;

    private Double oldFinalTotal;
    private Double newFinalTotal;

    public InvoiceHistory() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getOriginalInvoiceId() { return originalInvoiceId; }
    public void setOriginalInvoiceId(Long originalInvoiceId) { this.originalInvoiceId = originalInvoiceId; }
    public String getCustomerName() { return customerName; }
    public void setCustomerName(String customerName) { this.customerName = customerName; }
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