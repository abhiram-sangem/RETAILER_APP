package com.rt.sales;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.rt.inventory.Product;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;

@Entity
public class InvoiceItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "product_id")
    private Product product;

    // --- CHANGED TO DOUBLE TO SUPPORT FRACTIONAL RETURNS/EDITS ---
    private Double quantity;
    private Double price;
    
    // --- NEW FIELD FOR BOX vs PIECE ---
    private String sellType; 

    @ManyToOne
    @JoinColumn(name = "invoice_id")
    @JsonIgnore // Prevents infinite JSON recursion crash
    private Invoice invoice;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Product getProduct() { return product; }
    public void setProduct(Product product) { this.product = product; }

    public Double getQuantity() { return quantity; }
    public void setQuantity(Double quantity) { this.quantity = quantity; }

    public Double getPrice() { return price; }
    public void setPrice(Double price) { this.price = price; }
    
    public String getSellType() { return sellType; }
    public void setSellType(String sellType) { this.sellType = sellType; }

    public Invoice getInvoice() { return invoice; }
    public void setInvoice(Invoice invoice) { this.invoice = invoice; }
}