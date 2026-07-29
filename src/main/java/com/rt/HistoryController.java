package com.rt;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/history")
@CrossOrigin(origins = "*")
public class HistoryController {

    @Autowired
    private InventoryLogRepository inventoryLogRepository;

    @Autowired
    private InvoiceHistoryRepository invoiceHistoryRepository;

    @GetMapping("/inventory")
    public List<InventoryLog> getInventoryHistory() {
        return inventoryLogRepository.findAllByOrderByTimestampDesc();
    }

    @GetMapping("/invoices")
    public List<InvoiceHistory> getInvoiceEditHistory() {
        return invoiceHistoryRepository.findAllByOrderByEditDateDesc();
    }
}