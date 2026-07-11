package com.rt;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/invoices")
@CrossOrigin(origins = "*")
public class InvoiceController {
    @Autowired
    private InvoiceRepository invoiceRepository;

    @Autowired
    private ProductRepository productRepository;

    @GetMapping
    public ResponseEntity<List<Invoice>> getAllInvoices() {
        List<Invoice> invoices = invoiceRepository.findAll();
        return ResponseEntity.ok(invoices);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Invoice> getInvoiceById(@PathVariable Long id) {
        return invoiceRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/create")
    public ResponseEntity<?> createInvoice(@RequestBody Map<String, Object> request) {
        String customerName = (String) request.get("customerName");
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> cartItems = (List<Map<String, Object>>) request.get("cartItems");

        if (customerName == null || cartItems == null || cartItems.isEmpty()) {
            return ResponseEntity.badRequest().build();
        }

        // Safely extract the new billing details from the frontend JSON
        Double grossTotal = request.get("grossTotal") != null ? ((Number) request.get("grossTotal")).doubleValue() : 0.0;
        Double discountPercent = request.get("discountPercent") != null ? ((Number) request.get("discountPercent")).doubleValue() : 0.0;
        Double cgst = request.get("cgst") != null ? ((Number) request.get("cgst")).doubleValue() : 0.0;
        Double sgst = request.get("sgst") != null ? ((Number) request.get("sgst")).doubleValue() : 0.0;
        Double finalTotal = request.get("finalTotal") != null ? ((Number) request.get("finalTotal")).doubleValue() : 0.0;

        Invoice invoice = new Invoice();
        invoice.setCustomerName(customerName);
        invoice.setOrderDate(LocalDateTime.now());
        
        // Save all the new math fields
        invoice.setGrossTotal(grossTotal);
        invoice.setDiscountPercent(discountPercent);
        invoice.setCgst(cgst);
        invoice.setSgst(sgst);
        invoice.setFinalTotal(finalTotal);
        invoice.setTotalAmount(finalTotal);

        for (Map<String, Object> item : cartItems) {
            Long productId = Long.valueOf(item.get("id").toString());
            Integer quantity = Integer.valueOf(item.get("quantity").toString());

            Product product = productRepository.findById(productId).orElse(null);
            if (product != null) {
                // INVENTORY LOGIC: Check if we have enough stock before selling!
                if (product.getStock() < quantity) {
                    return ResponseEntity.badRequest().body("Not enough stock for " + product.getName());
                }

                // INVENTORY LOGIC: Deduct the sold quantity from the available stock
                product.setStock(product.getStock() - quantity);
                productRepository.save(product);

                double price = product.getPrice();
                InvoiceItem invoiceItem = new InvoiceItem(invoice, product, quantity, price);
                invoice.addItem(invoiceItem);
            }
        }

        // No need to calculate totalAmount manually anymore, we trust the finalTotal
        Invoice savedInvoice = invoiceRepository.save(invoice);
        return ResponseEntity.ok(savedInvoice);
    }

    @PostMapping
    public ResponseEntity<Invoice> addInvoice(@RequestBody Invoice invoice) {
        invoice.setOrderDate(LocalDateTime.now());
        Invoice savedInvoice = invoiceRepository.save(invoice);
        return ResponseEntity.ok(savedInvoice);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Invoice> updateInvoice(@PathVariable Long id, @RequestBody Invoice invoiceDetails) {
        return invoiceRepository.findById(id)
                .map(invoice -> {
                    invoice.setCustomerName(invoiceDetails.getCustomerName());
                    
                    // Replace totalAmount with all the new detailed fields
                    invoice.setGrossTotal(invoiceDetails.getGrossTotal());
                    invoice.setDiscountPercent(invoiceDetails.getDiscountPercent());
                    invoice.setCgst(invoiceDetails.getCgst());
                    invoice.setSgst(invoiceDetails.getSgst());
                    invoice.setFinalTotal(invoiceDetails.getFinalTotal());
                    invoice.setTotalAmount(invoiceDetails.getFinalTotal()); // Ensure totalAmount is updated to match finalTotal
                    
                    return ResponseEntity.ok(invoiceRepository.save(invoice));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteInvoice(@PathVariable Long id) {
        if (invoiceRepository.existsById(id)) {
            invoiceRepository.deleteById(id);
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.notFound().build();
    }
}