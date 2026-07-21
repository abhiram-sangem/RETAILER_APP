package com.rt;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Entity
public class PurchaseInvoice {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String customInvoiceId;
    private String sellerName;
    private LocalDate purchaseDate; 
    private LocalDateTime entryDate; 

    private Double grossTotal;
    private Double discountPercent;
    private Double cgst;
    private Double sgst;
    private Double finalTotal;

    @OneToMany(cascade = CascadeType.ALL, mappedBy = "purchaseInvoice")
    private List<PurchaseInvoiceItem> items;

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getCustomInvoiceId() { return customInvoiceId; }
    public void setCustomInvoiceId(String customInvoiceId) { this.customInvoiceId = customInvoiceId; }

    public String getSellerName() { return sellerName; }
    public void setSellerName(String sellerName) { this.sellerName = sellerName; }

    public LocalDate getPurchaseDate() { return purchaseDate; }
    public void setPurchaseDate(LocalDate purchaseDate) { this.purchaseDate = purchaseDate; }

    public LocalDateTime getEntryDate() { return entryDate; }
    public void setEntryDate(LocalDateTime entryDate) { this.entryDate = entryDate; }

    public Double getGrossTotal() { return grossTotal; }
    public void setGrossTotal(Double grossTotal) { this.grossTotal = grossTotal; }

    public Double getDiscountPercent() { return discountPercent; }
    public void setDiscountPercent(Double discountPercent) { this.discountPercent = discountPercent; }

    public Double getCgst() { return cgst; }
    public void setCgst(Double cgst) { this.cgst = cgst; }

    public Double getSgst() { return sgst; }
    public void setSgst(Double sgst) { this.sgst = sgst; }

    public Double getFinalTotal() { return finalTotal; }
    public void setFinalTotal(Double finalTotal) { this.finalTotal = finalTotal; }

    public List<PurchaseInvoiceItem> getItems() { return items; }
    public void setItems(List<PurchaseInvoiceItem> items) { this.items = items; }
}