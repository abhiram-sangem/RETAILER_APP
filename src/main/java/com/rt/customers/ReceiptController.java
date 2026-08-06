package com.rt.customers;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

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
            
            // Read the new Discount "Less" Amount (Default to 0 if empty)
            Double discountAmount = payload.containsKey("discountAmount") && payload.get("discountAmount") != null && !payload.get("discountAmount").toString().isEmpty() 
                ? Double.parseDouble(payload.get("discountAmount").toString()) 
                : 0.0;
                
            String paymentMode = (String) payload.get("paymentMode");
            String remarks = (String) payload.get("remarks");

            Customer customer = customerRepository.findById(customerId)
                    .orElseThrow(() -> new RuntimeException("Customer not found"));

            // LEDGER LOGIC: Deduct Both the Cash Received AND the Discount!
            customer.setBalance(customer.getBalance() - (amount + discountAmount));
            customerRepository.save(customer);

            Receipt receipt = new Receipt();
            receipt.setCustomerId(customerId);
            receipt.setCustomerName(customer.getName());
            receipt.setAmount(amount);
            receipt.setDiscountAmount(discountAmount);
            receipt.setPaymentMode(paymentMode);
            receipt.setRemarks(remarks);
            
            // Handle Manual Date
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