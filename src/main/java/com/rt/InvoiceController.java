package com.rt;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

@RestController
@RequestMapping("/api/invoices")
public class InvoiceController {

    @Autowired
    private InvoiceRepository invoiceRepository;

    @Autowired
    private ProductRepository productRepository;

    @GetMapping
    public List<Invoice> getAllInvoices() {
        return invoiceRepository.findAll();
    }

    @GetMapping("/{id}")
    public Invoice getInvoiceById(@PathVariable Long id) {
        return invoiceRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Invoice not found"));
    }

    // Accepts both standard and /create endpoints to prevent 404 errors
    @PostMapping(value = {"", "/create"})
    public Invoice createInvoice(@RequestBody InvoiceRequest request) {
        try {
            Invoice invoice = new Invoice();
            invoice.setCustomerName(request.getCustomerName());

            // Safely parse order date from frontend
            if (request.getOrderDate() != null && !request.getOrderDate().trim().isEmpty()) {
                invoice.setOrderDate(LocalDateTime.of(LocalDate.parse(request.getOrderDate().trim()), LocalTime.now()));
            } else {
                invoice.setOrderDate(LocalDateTime.now());
            }

            invoice.setGrossTotal(request.getGrossTotal() != null ? request.getGrossTotal() : 0.0);
            invoice.setDiscountPercent(request.getDiscountPercent() != null ? request.getDiscountPercent() : 0.0);
            invoice.setCgst(request.getCgst() != null ? request.getCgst() : 0.0);
            invoice.setSgst(request.getSgst() != null ? request.getSgst() : 0.0);
            invoice.setFinalTotal(request.getFinalTotal() != null ? request.getFinalTotal() : 0.0);
            invoice.setPaymentMethod(request.getPaymentMethod() != null ? request.getPaymentMethod() : "Cash");

            List<InvoiceItem> items = new ArrayList<>();
            if (request.getCartItems() != null) {
                for (InvoiceRequest.CartItemRequest itemReq : request.getCartItems()) {
                    Product product = productRepository.findById(itemReq.getId())
                            .orElseThrow(() -> new RuntimeException("Product not found: " + itemReq.getId()));

                    int currentStock = product.getStock() == null ? 0 : product.getStock();
                    int qty = itemReq.getQuantity() != null ? itemReq.getQuantity() : 1;
                    
                    product.setStock(Math.max(0, currentStock - qty));
                    productRepository.save(product);

                    InvoiceItem item = new InvoiceItem();
                    item.setProduct(product);
                    item.setQuantity(qty);
                    item.setPrice(itemReq.getPrice() != null ? itemReq.getPrice() : product.getPrice());
                    item.setInvoice(invoice);
                    items.add(item);
                }
            }

            invoice.setItems(items);
            return invoiceRepository.save(invoice);
        } catch (Exception e) {
            e.printStackTrace();
            throw new RuntimeException("Error creating invoice: " + e.getMessage());
        }
    }

    // This annotation prevents crashes if React sends extra data (like product names)
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class InvoiceRequest {
        private String customerName;
        private List<CartItemRequest> cartItems;
        private Double grossTotal;
        private Double discountPercent;
        private Double cgst;
        private Double sgst;
        private Double finalTotal;
        private String paymentMethod;
        private String orderDate;

        public String getCustomerName() { return customerName; }
        public void setCustomerName(String customerName) { this.customerName = customerName; }
        public List<CartItemRequest> getCartItems() { return cartItems; }
        public void setCartItems(List<CartItemRequest> cartItems) { this.cartItems = cartItems; }
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
        public String getPaymentMethod() { return paymentMethod; }
        public void setPaymentMethod(String paymentMethod) { this.paymentMethod = paymentMethod; }
        public String getOrderDate() { return orderDate; }
        public void setOrderDate(String orderDate) { this.orderDate = orderDate; }

        @JsonIgnoreProperties(ignoreUnknown = true)
        public static class CartItemRequest {
            private Long id;
            private Integer quantity;
            private Double price;

            public Long getId() { return id; }
            public void setId(Long id) { this.id = id; }
            public Integer getQuantity() { return quantity; }
            public void setQuantity(Integer quantity) { this.quantity = quantity; }
            public Double getPrice() { return price; }
            public void setPrice(Double price) { this.price = price; }
        }
    }
}