package com.rt.history;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/history")
@CrossOrigin(origins = "*")
public class HistoryController {

    @Autowired
    private InventoryHistoryRepository inventoryHistoryRepository;

    @Autowired
    private InvoiceHistoryRepository invoiceHistoryRepository;

    @Autowired
    private PurchaseInvoiceHistoryRepository purchaseInvoiceHistoryRepository;

    @GetMapping("/inventory")
    public ResponseEntity<List<InventoryHistory>> getInventoryHistory() {
        return ResponseEntity.ok(inventoryHistoryRepository.findAllByOrderByTimestampDesc());
    }

    @GetMapping("/invoices")
    public ResponseEntity<List<InvoiceHistory>> getInvoiceHistory() {
        return ResponseEntity.ok(invoiceHistoryRepository.findAllByOrderByEditDateDesc());
    }

    @GetMapping("/purchase-invoices")
    public ResponseEntity<List<PurchaseInvoiceHistory>> getPurchaseInvoiceHistory() {
        return ResponseEntity.ok(purchaseInvoiceHistoryRepository.findAllByOrderByEditDateDesc());
    }
}