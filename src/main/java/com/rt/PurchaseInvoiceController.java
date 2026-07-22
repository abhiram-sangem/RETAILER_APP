package com.rt;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@RestController
@RequestMapping("/api/purchase-invoices")
public class PurchaseInvoiceController {

    @Autowired
    private PurchaseInvoiceRepository purchaseInvoiceRepository;

    @Autowired
    private ProductRepository productRepository;

    @GetMapping
    public List<PurchaseInvoice> getAllPurchaseInvoices() {
        return purchaseInvoiceRepository.findAll();
    }

    @GetMapping("/{id}")
    public PurchaseInvoice getPurchaseInvoiceById(@PathVariable Long id) {
        return purchaseInvoiceRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Purchase Invoice not found"));
    }

    @PostMapping
    public PurchaseInvoice createPurchaseInvoice(@RequestBody PurchaseInvoiceRequest request) {
        try {
            PurchaseInvoice invoice = new PurchaseInvoice();
            invoice.setCustomInvoiceId(request.getCustomInvoiceId());
            invoice.setSellerName(request.getSellerName());
            
            // Safely parse purchase date from frontend
            if (request.getPurchaseDate() != null && !request.getPurchaseDate().trim().isEmpty()) {
                invoice.setPurchaseDate(LocalDate.parse(request.getPurchaseDate().trim()));
            } else {
                invoice.setPurchaseDate(LocalDate.now());
            }
            
            invoice.setEntryDate(LocalDateTime.now());
            invoice.setGrossTotal(request.getGrossTotal() != null ? request.getGrossTotal() : 0.0);
            invoice.setDiscountPercent(request.getDiscountPercent() != null ? request.getDiscountPercent() : 0.0);
            invoice.setCgst(request.getCgst() != null ? request.getCgst() : 0.0);
            invoice.setSgst(request.getSgst() != null ? request.getSgst() : 0.0);
            invoice.setFinalTotal(request.getFinalTotal() != null ? request.getFinalTotal() : 0.0);

            List<PurchaseInvoiceItem> items = new ArrayList<>();
            if (request.getItems() != null) {
                for (PurchaseInvoiceRequest.ItemRequest itemReq : request.getItems()) {
                    Product product = productRepository.findById(itemReq.getProductId())
                            .orElseThrow(() -> new RuntimeException("Product not found: " + itemReq.getProductId()));

                    // Update Stock (+ since it's a purchase)
                    int currentStock = product.getStock() == null ? 0 : product.getStock();
                    int qty = itemReq.getQuantity() != null ? itemReq.getQuantity() : 1;
                    product.setStock(currentStock + qty);
                    
                    // Update Purchase Price in the main inventory
                    if (itemReq.getPurchasePrice() != null) {
                        product.setPurchasePrice(itemReq.getPurchasePrice());
                    }
                    productRepository.save(product);

                    PurchaseInvoiceItem item = new PurchaseInvoiceItem();
                    item.setProduct(product);
                    item.setQuantity(qty);
                    item.setPurchasePrice(itemReq.getPurchasePrice());
                    item.setPurchaseInvoice(invoice);
                    items.add(item);
                }
            }

            invoice.setItems(items);
            return purchaseInvoiceRepository.save(invoice);
        } catch (Exception e) {
            e.printStackTrace();
            throw new RuntimeException("Error creating purchase invoice: " + e.getMessage());
        }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class PurchaseInvoiceRequest {
        private String customInvoiceId;
        private String sellerName;
        private String purchaseDate;
        private Double grossTotal;
        private Double discountPercent;
        private Double cgst;
        private Double sgst;
        private Double finalTotal;
        private List<ItemRequest> items;

        public String getCustomInvoiceId() { return customInvoiceId; }
        public void setCustomInvoiceId(String customInvoiceId) { this.customInvoiceId = customInvoiceId; }
        public String getSellerName() { return sellerName; }
        public void setSellerName(String sellerName) { this.sellerName = sellerName; }
        public String getPurchaseDate() { return purchaseDate; }
        public void setPurchaseDate(String purchaseDate) { this.purchaseDate = purchaseDate; }
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
        public List<ItemRequest> getItems() { return items; }
        public void setItems(List<ItemRequest> items) { this.items = items; }

        @JsonIgnoreProperties(ignoreUnknown = true)
        public static class ItemRequest {
            private Long productId;
            private Integer quantity;
            private Double purchasePrice;

            public Long getProductId() { return productId; }
            public void setProductId(Long productId) { this.productId = productId; }
            public Integer getQuantity() { return quantity; }
            public void setQuantity(Integer quantity) { this.quantity = quantity; }
            public Double getPurchasePrice() { return purchasePrice; }
            public void setPurchasePrice(Double purchasePrice) { this.purchasePrice = purchasePrice; }
        }
    }
}