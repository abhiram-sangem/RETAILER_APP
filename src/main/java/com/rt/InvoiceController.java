package com.rt;

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

    // Get all invoices
    @GetMapping
    public ResponseEntity<List<Invoice>> getAllInvoices() {
        List<Invoice> invoices = invoiceRepository.findAll();
        return ResponseEntity.ok(invoices);
    }

    // Get invoice by ID
    @GetMapping("/{id}")
    public ResponseEntity<Invoice> getInvoiceById(@PathVariable Long id) {
        return invoiceRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // Create invoice from cart data
    @PostMapping("/create")
    public ResponseEntity<Invoice> createInvoice(@RequestBody Map<String, Object> request) {
        String customerName = (String) request.get("customerName");
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> cartItems = (List<Map<String, Object>>) request.get("cartItems");

        if (customerName == null || cartItems == null || cartItems.isEmpty()) {
            return ResponseEntity.badRequest().build();
        }

        Invoice invoice = new Invoice();
        invoice.setCustomerName(customerName);
        double totalAmount = 0.0;

        for (Map<String, Object> item : cartItems) {
            Long productId = Long.valueOf(item.get("id").toString());
            Integer quantity = Integer.valueOf(item.get("quantity").toString());

            Product product = productRepository.findById(productId).orElse(null);
            if (product != null) {
                double price = product.getPrice();
                InvoiceItem invoiceItem = new InvoiceItem(invoice, product, quantity, price);
                invoice.addItem(invoiceItem);
                totalAmount += price * quantity;
            }
        }

        invoice.setTotalAmount(totalAmount);
        Invoice savedInvoice = invoiceRepository.save(invoice);
        return ResponseEntity.ok(savedInvoice);
    }

    // Add new invoice
    @PostMapping
    public ResponseEntity<Invoice> addInvoice(@RequestBody Invoice invoice) {
        Invoice savedInvoice = invoiceRepository.save(invoice);
        return ResponseEntity.ok(savedInvoice);
    }

    // Update invoice
    @PutMapping("/{id}")
    public ResponseEntity<Invoice> updateInvoice(@PathVariable Long id, @RequestBody Invoice invoiceDetails) {
        return invoiceRepository.findById(id)
                .map(invoice -> {
                    invoice.setCustomerName(invoiceDetails.getCustomerName());
                    invoice.setTotalAmount(invoiceDetails.getTotalAmount());
                    return ResponseEntity.ok(invoiceRepository.save(invoice));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    // Delete invoice
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteInvoice(@PathVariable Long id) {
        if (invoiceRepository.existsById(id)) {
            invoiceRepository.deleteById(id);
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.notFound().build();
    }

}
