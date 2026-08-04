package com.rt;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@RestController
@RequestMapping("/api/purchase-invoices")
@CrossOrigin(origins = "*")
public class PurchaseInvoiceController {

    @Autowired
    private PurchaseInvoiceRepository purchaseInvoiceRepository;

    @Autowired
    private ProductRepository productRepository;
    
    @Autowired
    private InventoryLogRepository inventoryLogRepository;

    @GetMapping
    public List<PurchaseInvoice> getAllPurchaseInvoices() {
        return purchaseInvoiceRepository.findAll();
    }

    @GetMapping("/{id}")
    public PurchaseInvoice getPurchaseInvoiceById(@PathVariable Long id) {
        return purchaseInvoiceRepository.findById(id).orElseThrow();
    }

    @PostMapping
    public PurchaseInvoice createPurchaseInvoice(@RequestBody PurchaseInvoiceRequest request) {
        PurchaseInvoice invoice = new PurchaseInvoice();
        invoice.setSellerName(request.getSellerName());
        
        // Parse the incoming string date from React into a LocalDate
        if (request.getPurchaseDate() != null && !request.getPurchaseDate().trim().isEmpty()) {
            invoice.setPurchaseDate(LocalDate.parse(request.getPurchaseDate().trim()));
        } else {
            invoice.setPurchaseDate(LocalDate.now());
        }
        
        invoice.setEntryDate(LocalDateTime.now());
        invoice.setCustomInvoiceId(request.getCustomInvoiceId());
        
        invoice.setGrossTotal(request.getGrossTotal() != null ? request.getGrossTotal() : 0.0);
        invoice.setDiscountPercent(request.getDiscountPercent() != null ? request.getDiscountPercent() : 0.0);
        invoice.setCgst(request.getCgst() != null ? request.getCgst() : 0.0);
        invoice.setSgst(request.getSgst() != null ? request.getSgst() : 0.0);
        invoice.setFinalTotal(request.getFinalTotal() != null ? request.getFinalTotal() : 0.0);

        List<PurchaseInvoiceItem> items = new ArrayList<>();
        if (request.getItems() != null) {
            for (PurchaseInvoiceRequest.PurchaseItemRequest itemReq : request.getItems()) {
                Product product = productRepository.findById(itemReq.getProductId()).orElseThrow();
                int qty = itemReq.getQuantity() != null ? itemReq.getQuantity() : 1;
                
                product.setStock((product.getStock() == null ? 0 : product.getStock()) + qty);
                productRepository.save(product);

                PurchaseInvoiceItem item = new PurchaseInvoiceItem();
                item.setProduct(product);
                item.setQuantity(qty);
                item.setPurchasePrice(itemReq.getPurchasePrice() != null ? itemReq.getPurchasePrice() : product.getPurchasePrice());
                item.setPurchaseInvoice(invoice);
                items.add(item);
                
                inventoryLogRepository.save(new InventoryLog(
                    product.getId(), product.getName(), "PURCHASE", 
                    qty, product.getStock(), "Purchased via Bill #" + invoice.getCustomInvoiceId()
                ));
            }
        }
        invoice.setItems(items);
        return purchaseInvoiceRepository.save(invoice);
    }

    public static class PurchaseInvoiceRequest {
        private String sellerName;
        private String purchaseDate; // Changed to String to match the frontend JSON
        private String customInvoiceId;
        private Double grossTotal;
        private Double discountPercent;
        private Double cgst;
        private Double sgst;
        private Double finalTotal;
        private List<PurchaseItemRequest> items;

        public String getSellerName() { return sellerName; }
        public void setSellerName(String sellerName) { this.sellerName = sellerName; }
        
        public String getPurchaseDate() { return purchaseDate; }
        public void setPurchaseDate(String purchaseDate) { this.purchaseDate = purchaseDate; }
        
        public String getCustomInvoiceId() { return customInvoiceId; }
        public void setCustomInvoiceId(String customInvoiceId) { this.customInvoiceId = customInvoiceId; }
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
        public List<PurchaseItemRequest> getItems() { return items; }
        public void setItems(List<PurchaseItemRequest> items) { this.items = items; }

        public static class PurchaseItemRequest {
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