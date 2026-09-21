package com.rt.customers;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/receipts")
@CrossOrigin(origins = "*")
public class ReceiptController {

    @Autowired
    private ReceiptRepository receiptRepository;

    @Autowired
    private CustomerRepository customerRepository;

    @PostMapping
    @Transactional
    public ResponseEntity<?> createReceipt(@RequestBody Map<String, Object> payload) {
        try {
            Long customerId = Long.parseLong(payload.get("customerId").toString());
            Double amount = Double.parseDouble(payload.get("amount").toString());
            
            Double discountAmount = payload.containsKey("discountAmount") && payload.get("discountAmount") != null && !payload.get("discountAmount").toString().isEmpty() 
                 ? Double.parseDouble(payload.get("discountAmount").toString()) 
                 : 0.0;
                 
            String paymentMode = (String) payload.get("paymentMode");
            String remarks = (String) payload.get("remarks");
            
            // --- CATCH NEW FIELD ---
            String customReceiptId = (String) payload.get("customReceiptId");

            Customer customer = customerRepository.findById(customerId)
                    .orElseThrow(() -> new RuntimeException("Customer not found"));

            customer.setBalance(customer.getBalance() - (amount + discountAmount));
            customerRepository.save(customer);

            Receipt receipt = new Receipt();
            receipt.setCustomerId(customerId);
            receipt.setCustomerName(customer.getName());
            receipt.setAmount(amount);
            receipt.setDiscountAmount(discountAmount);
            receipt.setPaymentMode(paymentMode);
            receipt.setRemarks(remarks);
            receipt.setCustomReceiptId(customReceiptId);

            String dateStr = (String) payload.get("receiptDate");
            if (dateStr != null && !dateStr.isEmpty()) {
                receipt.setReceiptDate(LocalDate.parse(dateStr).atStartOfDay());
            } else {
                receipt.setReceiptDate(LocalDateTime.now());
            }

            Receipt savedReceipt = receiptRepository.save(receipt);
            return ResponseEntity.ok(savedReceipt);

        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping
    public ResponseEntity<?> getAllReceipts() {
        return ResponseEntity.ok(receiptRepository.findAllByOrderByReceiptDateDesc());
    }
}