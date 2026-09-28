package com.rt.customers;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.rt.history.ReceiptHistory;
import com.rt.history.ReceiptHistoryRepository;

@RestController
@RequestMapping("/api/receipts")
@CrossOrigin(origins = "*")
public class ReceiptController {

    @Autowired
    private ReceiptRepository receiptRepository;

    @Autowired
    private CustomerRepository customerRepository;
    
    @Autowired
    private ReceiptHistoryRepository receiptHistoryRepository;

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
                LocalDate parsedDate = LocalDate.parse(dateStr);
                if (parsedDate.isEqual(LocalDate.now())) {
                    receipt.setReceiptDate(LocalDateTime.now());
                } else {
                    receipt.setReceiptDate(parsedDate.atTime(LocalTime.MAX)); 
                }
            } else {
                receipt.setReceiptDate(LocalDateTime.now());
            }

            Receipt savedReceipt = receiptRepository.save(receipt);
            return ResponseEntity.ok(savedReceipt);

        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PutMapping("/{id}")
    @Transactional
    public ResponseEntity<?> updateReceipt(@PathVariable Long id, @RequestBody Map<String, Object> payload) {
        try {
            Receipt receipt = receiptRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Receipt not found"));
            
            Customer customer = customerRepository.findById(receipt.getCustomerId())
                .orElseThrow(() -> new RuntimeException("Customer not found"));

            Double newAmount = Double.parseDouble(payload.get("amount").toString());
            Double newDiscount = payload.containsKey("discountAmount") && payload.get("discountAmount") != null && !payload.get("discountAmount").toString().isEmpty() 
                 ? Double.parseDouble(payload.get("discountAmount").toString()) 
                 : 0.0;

            Double oldTotal = receipt.getAmount() + (receipt.getDiscountAmount() != null ? receipt.getDiscountAmount() : 0.0);
            Double newTotal = newAmount + newDiscount;

            // Log the history before changing
            ReceiptHistory history = new ReceiptHistory();
            history.setOriginalReceiptId(receipt.getId());
            history.setCustomerName(receipt.getCustomerName());
            history.setOldAmount(receipt.getAmount());
            history.setOldDiscount(receipt.getDiscountAmount() != null ? receipt.getDiscountAmount() : 0.0);
            history.setNewAmount(newAmount);
            history.setNewDiscount(newDiscount);
            history.setEditDate(LocalDateTime.now());
            receiptHistoryRepository.save(history);

            // Adjust balance: Add back old, subtract new
            customer.setBalance(customer.getBalance() + oldTotal - newTotal);
            customerRepository.save(customer);
            
            receipt.setAmount(newAmount);
            receipt.setDiscountAmount(newDiscount);
            receipt.setPaymentMode((String) payload.get("paymentMode"));
            receipt.setRemarks((String) payload.get("remarks"));
            receipt.setCustomReceiptId((String) payload.get("customReceiptId"));

            String dateStr = (String) payload.get("receiptDate");
            if (dateStr != null && !dateStr.isEmpty()) {
                LocalDate parsedDate = LocalDate.parse(dateStr);
                receipt.setReceiptDate(parsedDate.atTime(LocalTime.MAX));
            }

            return ResponseEntity.ok(receiptRepository.save(receipt));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping
    public ResponseEntity<?> getAllReceipts() {
        return ResponseEntity.ok(receiptRepository.findAllByOrderByReceiptDateDesc());
    }
}