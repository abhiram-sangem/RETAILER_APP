package com.rt.history;

import java.time.LocalDateTime;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;

@Entity
public class ReceiptHistory {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    private Long originalReceiptId;
    private String customerName;
    private LocalDateTime editDate;
    
    private Double oldAmount;
    private Double oldDiscount;
    private Double newAmount;
    private Double newDiscount;

    public ReceiptHistory() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getOriginalReceiptId() { return originalReceiptId; }
    public void setOriginalReceiptId(Long originalReceiptId) { this.originalReceiptId = originalReceiptId; }
    public String getCustomerName() { return customerName; }
    public void setCustomerName(String customerName) { this.customerName = customerName; }
    public LocalDateTime getEditDate() { return editDate; }
    public void setEditDate(LocalDateTime editDate) { this.editDate = editDate; }
    public Double getOldAmount() { return oldAmount; }
    public void setOldAmount(Double oldAmount) { this.oldAmount = oldAmount; }
    public Double getOldDiscount() { return oldAmount; } // Fixed getter
    public void setOldDiscount(Double oldDiscount) { this.oldDiscount = oldDiscount; }
    public Double getNewAmount() { return newAmount; }
    public void setNewAmount(Double newAmount) { this.newAmount = newAmount; }
    public Double getNewDiscount() { return newDiscount; }
    public void setNewDiscount(Double newDiscount) { this.newDiscount = newDiscount; }
}