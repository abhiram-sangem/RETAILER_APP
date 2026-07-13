package com.rt;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonManagedReference;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;

@Entity
@Table(name = "invoices")
public class Invoice {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String customerName;

    @Column(nullable = false)
    private Double totalAmount;

    @Column(columnDefinition = "double default 0.0")
    private Double grossTotal;

    @Column(columnDefinition = "double default 0.0")
    private Double discountPercent;

    @Column(columnDefinition = "double default 0.0")
    private Double cgst;

    @Column(columnDefinition = "double default 0.0")
    private Double sgst;

    @Column(columnDefinition = "double default 0.0")
    private Double finalTotal;

    @Column(nullable = false)
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime orderDate;

    @OneToMany(mappedBy = "invoice", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonManagedReference
    private List<InvoiceItem> items = new ArrayList<>();

    public Invoice() {
        this.orderDate = LocalDateTime.now();
    }

    public Invoice(String customerName, Double grossTotal, Double discountPercent, Double cgst, Double sgst, Double finalTotal) {
        this.customerName = customerName;
        this.grossTotal = grossTotal;
        this.discountPercent = discountPercent;
        this.cgst = cgst;
        this.sgst = sgst;
        this.finalTotal = finalTotal;
        this.orderDate = LocalDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getCustomerName() {
        return customerName;
    }

    public void setCustomerName(String customerName) {
        this.customerName = customerName;
    }

    public Double getTotalAmount() { 
        return totalAmount;
    }
    public void setTotalAmount(Double totalAmount) { 
        this.totalAmount = totalAmount;
    }
    
    public LocalDateTime getOrderDate() {
        return orderDate;
    }

    public void setOrderDate(LocalDateTime orderDate) {
        this.orderDate = orderDate;
    }

    public List<InvoiceItem> getItems() {
        return items;
    }

    public void setItems(List<InvoiceItem> items) {
        this.items = items;
    }

    public void addItem(InvoiceItem item) {
        items.add(item);
        item.setInvoice(this);
    }

    public void removeItem(InvoiceItem item) {
        items.remove(item);
        item.setInvoice(null);
    }

    public Double getGrossTotal() { 
        return grossTotal; 
    }

    public void setGrossTotal(Double grossTotal) { 
        this.grossTotal = grossTotal; 
    }

    public Double getDiscountPercent() { 
        return discountPercent;
    }

    public void setDiscountPercent(Double discountPercent) { 
        this.discountPercent = discountPercent;
    }

    public Double getCgst() {
        return cgst; 
    }

    public void setCgst(Double cgst) { 
        this.cgst = cgst; 
    }

    public Double getSgst() { 
        return sgst;
    }

    public void setSgst(Double sgst) { 
        this.sgst = sgst; 
    }

    public Double getFinalTotal() { 
        return finalTotal; 
    }

    public void setFinalTotal(Double finalTotal) {
        this.finalTotal = finalTotal; 
    }
}
