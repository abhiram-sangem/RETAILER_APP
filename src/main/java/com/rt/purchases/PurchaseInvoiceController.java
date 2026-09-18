package com.rt.purchases;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
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

import com.rt.history.InventoryHistory;
import com.rt.history.InventoryHistoryRepository;
import com.rt.history.PurchaseInvoiceHistory;
import com.rt.history.PurchaseInvoiceHistoryRepository;
import com.rt.inventory.Product;
import com.rt.inventory.ProductRepository;

@RestController
@RequestMapping("/api/purchase-invoices")
@CrossOrigin(origins = "*")
public class PurchaseInvoiceController {

    @Autowired
    private PurchaseInvoiceRepository purchaseInvoiceRepository;
    @Autowired
    private ProductRepository productRepository;
    @Autowired
    private PurchaseInvoiceHistoryRepository purchaseInvoiceHistoryRepository;
    @Autowired
    private InventoryHistoryRepository inventoryHistoryRepository;

    @GetMapping
    public ResponseEntity<List<PurchaseInvoice>> getAllPurchaseInvoices() {
        return ResponseEntity.ok(purchaseInvoiceRepository.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<PurchaseInvoice> getPurchaseInvoiceById(@PathVariable Long id) {
        return purchaseInvoiceRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    @Transactional
    public ResponseEntity<?> createPurchaseInvoice(@RequestBody Map<String, Object> payload) {
        try {
            PurchaseInvoice invoice = new PurchaseInvoice();
            invoice.setSellerName((String) payload.get("sellerName"));
            
            // --- CATCHING NEW VENDOR DATA ---
            invoice.setSellerPhone((String) payload.get("sellerPhone"));
            invoice.setSellerGst((String) payload.get("sellerGst"));

            invoice.setCustomInvoiceId((String) payload.get("customInvoiceId"));
            
            String dateStr = (String) payload.get("purchaseDate");
            if (dateStr != null && !dateStr.isEmpty()) {
                invoice.setPurchaseDate(LocalDate.parse(dateStr));
            }
            
            invoice.setEntryDate(LocalDateTime.now());
            invoice.setGrossTotal(Double.parseDouble(payload.get("grossTotal").toString()));
            invoice.setDiscountPercent(Double.parseDouble(payload.get("discountPercent").toString()));
            invoice.setCgst(Double.parseDouble(payload.get("cgst").toString()));
            invoice.setSgst(Double.parseDouble(payload.get("sgst").toString()));
            invoice.setFinalTotal(Double.parseDouble(payload.get("finalTotal").toString()));

            List<Map<String, Object>> itemsData = (List<Map<String, Object>>) payload.get("items");
            List<PurchaseInvoiceItem> items = new ArrayList<>();

            for (Map<String, Object> itemData : itemsData) {
                Long productId = Long.parseLong(itemData.get("productId").toString());
                int quantity = Integer.parseInt(itemData.get("quantity").toString());
                Double purchasePrice = Double.parseDouble(itemData.get("purchasePrice").toString());

                Product product = productRepository.findById(productId)
                        .orElseThrow(() -> new RuntimeException("Product not found"));

                product.setStock(product.getStock() + quantity);
                product.setPurchasePrice(purchasePrice);
                productRepository.save(product);

                InventoryHistory log = new InventoryHistory();
                log.setProductId(product.getId());
                log.setProductName(product.getName());
                log.setActionType("PURCHASE");
                log.setQuantityChanged(quantity); 
                log.setFinalStock(product.getStock());
                log.setDescription("Vendor Purchase from " + invoice.getSellerName());
                log.setTimestamp(LocalDateTime.now());
                inventoryHistoryRepository.save(log);

                PurchaseInvoiceItem item = new PurchaseInvoiceItem();
                item.setProduct(product);
                item.setQuantity(quantity);
                item.setPurchasePrice(purchasePrice);
                item.setPurchaseInvoice(invoice);
                items.add(item);
            }

            invoice.setItems(items);
            PurchaseInvoice savedInvoice = purchaseInvoiceRepository.save(invoice);
            return ResponseEntity.ok(savedInvoice);

        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PutMapping("/{id}")
    @Transactional
    public ResponseEntity<?> updatePurchaseInvoice(@PathVariable Long id, @RequestBody Map<String, Object> payload) {
        try {
            PurchaseInvoice existingInvoice = purchaseInvoiceRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Purchase Invoice not found"));

            StringBuilder oldItemsJson = new StringBuilder("[");
            for (int i = 0; i < existingInvoice.getItems().size(); i++) {
                PurchaseInvoiceItem oldItem = existingInvoice.getItems().get(i);
                oldItemsJson.append(String.format("{\"name\":\"%s\", \"qty\":%d, \"price\":%.2f}",
                        oldItem.getProduct().getName().replace("\"", "\\\""),
                        oldItem.getQuantity(),
                        oldItem.getPurchasePrice()));
                if (i < existingInvoice.getItems().size() - 1) oldItemsJson.append(",");
            }
            oldItemsJson.append("]");

            Double oldFinalTotal = existingInvoice.getFinalTotal();

            for (PurchaseInvoiceItem oldItem : existingInvoice.getItems()) {
                Product product = oldItem.getProduct();
                product.setStock(product.getStock() - oldItem.getQuantity());
                productRepository.save(product);

                InventoryHistory log = new InventoryHistory();
                log.setProductId(product.getId());
                log.setProductName(product.getName());
                log.setActionType("PURCHASE_EDIT_REVERT");
                log.setQuantityChanged(-oldItem.getQuantity());
                log.setFinalStock(product.getStock());
                log.setDescription("Reverting Purchase Invoice Edit #" + existingInvoice.getId());
                log.setTimestamp(LocalDateTime.now());
                inventoryHistoryRepository.save(log);
            }

            existingInvoice.getItems().clear();
            existingInvoice.setSellerName((String) payload.get("sellerName"));
            
            // --- CATCHING NEW VENDOR DATA ---
            existingInvoice.setSellerPhone((String) payload.get("sellerPhone"));
            existingInvoice.setSellerGst((String) payload.get("sellerGst"));

            existingInvoice.setCustomInvoiceId((String) payload.get("customInvoiceId"));
            
            String dateStr = (String) payload.get("purchaseDate");
            if (dateStr != null && !dateStr.isEmpty()) {
                existingInvoice.setPurchaseDate(LocalDate.parse(dateStr));
            }
            
            existingInvoice.setGrossTotal(Double.parseDouble(payload.get("grossTotal").toString()));
            existingInvoice.setDiscountPercent(Double.parseDouble(payload.get("discountPercent").toString()));
            existingInvoice.setCgst(Double.parseDouble(payload.get("cgst").toString()));
            existingInvoice.setSgst(Double.parseDouble(payload.get("sgst").toString()));
            existingInvoice.setFinalTotal(Double.parseDouble(payload.get("finalTotal").toString()));

            List<Map<String, Object>> itemsData = (List<Map<String, Object>>) payload.get("items");
            StringBuilder newItemsJson = new StringBuilder("[");

            for (int i = 0; i < itemsData.size(); i++) {
                Map<String, Object> itemData = itemsData.get(i);
                Long productId = Long.parseLong(itemData.get("productId").toString());
                int quantity = Integer.parseInt(itemData.get("quantity").toString());
                Double purchasePrice = Double.parseDouble(itemData.get("purchasePrice").toString());

                Product product = productRepository.findById(productId)
                        .orElseThrow(() -> new RuntimeException("Product not found"));

                product.setStock(product.getStock() + quantity);
                product.setPurchasePrice(purchasePrice);
                productRepository.save(product);

                InventoryHistory log = new InventoryHistory();
                log.setProductId(product.getId());
                log.setProductName(product.getName());
                log.setActionType("PURCHASE_EDIT_APPLY");
                log.setQuantityChanged(quantity); 
                log.setFinalStock(product.getStock());
                log.setDescription("Applying Edit to Purchase Invoice #" + existingInvoice.getId());
                log.setTimestamp(LocalDateTime.now());
                inventoryHistoryRepository.save(log);

                PurchaseInvoiceItem item = new PurchaseInvoiceItem();
                item.setProduct(product);
                item.setQuantity(quantity);
                item.setPurchasePrice(purchasePrice);
                item.setPurchaseInvoice(existingInvoice);
                existingInvoice.getItems().add(item);

                newItemsJson.append(String.format("{\"name\":\"%s\", \"qty\":%d, \"price\":%.2f}",
                        product.getName().replace("\"", "\\\""),
                        quantity,
                        purchasePrice));
                if (i < itemsData.size() - 1) newItemsJson.append(",");
            }
            newItemsJson.append("]");

            PurchaseInvoiceHistory history = new PurchaseInvoiceHistory();
            history.setOriginalPurchaseInvoiceId(existingInvoice.getId());
            history.setSellerName(existingInvoice.getSellerName());
            history.setEditDate(LocalDateTime.now());
            history.setOldItemsJson(oldItemsJson.toString());
            history.setNewItemsJson(newItemsJson.toString());
            history.setOldFinalTotal(oldFinalTotal);
            history.setNewFinalTotal(existingInvoice.getFinalTotal());
            purchaseInvoiceHistoryRepository.save(history);

            PurchaseInvoice savedInvoice = purchaseInvoiceRepository.save(existingInvoice);
            return ResponseEntity.ok(savedInvoice);

        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}