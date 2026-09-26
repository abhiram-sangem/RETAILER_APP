package com.rt.inventory;

import java.util.ArrayList;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.rt.InventoryLog;
import com.rt.InventoryLogRepository;

@RestController
@RequestMapping("/api/products")
@CrossOrigin(origins = "*")
public class ProductController {

    @Autowired
    private ProductRepository productRepository;
    
    @Autowired
    private InventoryLogRepository inventoryLogRepository;

    @GetMapping
    public List<Product> getAllProducts() {
        return productRepository.findAll();
    }

    @PostMapping
    public Product addProduct(@RequestBody Product product) {
        if (product.getMrp() == null) product.setMrp(product.getPrice());
        product.setId(null); 
        Product saved = productRepository.save(product);
        
        // Note: Ensure InventoryLog entity is also updated to use Double for stock changes
        inventoryLogRepository.save(new InventoryLog(
            saved.getId(), saved.getName(), "NEW_PRODUCT", 
            saved.getStock(), saved.getStock(), "Initial Stock Entry"
        ));
        
        return saved;
    }

    // --- SMART UPSERT BULK UPLOAD ENDPOINT ---
    @PostMapping("/bulk")
    public List<Product> addProductsBulk(@RequestBody List<Product> products) {
        List<Product> savedProducts = new ArrayList<>();
        
        for (Product p : products) {
            if (p.getName() == null || p.getName().trim().isEmpty()) continue;
            
            Product existing = null;
            
            if (p.getId() != null) {
                existing = productRepository.findById(p.getId()).orElse(null);
            }
            if (existing == null) {
                existing = productRepository.findFirstByName(p.getName().trim()).orElse(null);
            }
            
            if (existing != null) {
                // CHANGED: Use Double instead of Integer
                Double oldStock = existing.getStock() == null ? 0.0 : existing.getStock();
                Double newStock = p.getStock() == null ? 0.0 : p.getStock();
                
                existing.setName(p.getName());
                if (p.getHsnCode() != null && !p.getHsnCode().isEmpty()) existing.setHsnCode(p.getHsnCode());
                if (p.getPurchasePrice() != null && p.getPurchasePrice() > 0) existing.setPurchasePrice(p.getPurchasePrice());
                if (p.getMrp() != null && p.getMrp() > 0) existing.setMrp(p.getMrp());
                if (p.getPrice() != null && p.getPrice() > 0) existing.setPrice(p.getPrice());
                
                // Set piece data if it exists in the payload
                if (p.getPiecesPerBox() != null) existing.setPiecesPerBox(p.getPiecesPerBox());
                if (p.getPiecePurchasePrice() != null) existing.setPiecePurchasePrice(p.getPiecePurchasePrice());
                if (p.getPieceMrp() != null) existing.setPieceMrp(p.getPieceMrp());
                if (p.getPiecePrice() != null) existing.setPiecePrice(p.getPiecePrice());

                existing.setStock(newStock);
                
                Product saved = productRepository.save(existing);
                savedProducts.add(saved);
                
                if (!oldStock.equals(newStock)) {
                    inventoryLogRepository.save(new InventoryLog(
                        saved.getId(), saved.getName(), "BULK_UPDATE", 
                        newStock - oldStock, newStock, "Updated via Excel Import"
                    ));
                }
            } else {
                p.setId(null); 
                if (p.getMrp() == null || p.getMrp() == 0) p.setMrp(p.getPrice());
                Product saved = productRepository.save(p);
                savedProducts.add(saved);
                
                inventoryLogRepository.save(new InventoryLog(
                    saved.getId(), saved.getName(), "BULK_IMPORT", 
                    saved.getStock(), saved.getStock(), "Imported via Excel"
                ));
            }
        }
        return savedProducts;
    }

    @PutMapping("/{id}")
    public Product updateProduct(@PathVariable Long id, @RequestBody Product details) {
        Product product = productRepository.findById(id).orElseThrow();
        // CHANGED: Use Double instead of Integer
        Double oldStock = product.getStock() == null ? 0.0 : product.getStock();
        Double newStock = details.getStock() == null ? 0.0 : details.getStock();
        
        product.setName(details.getName());
        product.setHsnCode(details.getHsnCode());
        product.setPurchasePrice(details.getPurchasePrice());
        product.setMrp(details.getMrp() != null ? details.getMrp() : details.getPrice());
        product.setPrice(details.getPrice());
        
        product.setPiecesPerBox(details.getPiecesPerBox());
        product.setPiecePurchasePrice(details.getPiecePurchasePrice());
        product.setPieceMrp(details.getPieceMrp());
        product.setPiecePrice(details.getPiecePrice());

        product.setStock(newStock);
        
        Product saved = productRepository.save(product);
        
        if (!oldStock.equals(newStock)) {
            inventoryLogRepository.save(new InventoryLog(
                saved.getId(), saved.getName(), "MANUAL_UPDATE", 
                newStock - oldStock, newStock, "Manual Edit via Products View"
            ));
        }
        return saved;
    }

    @DeleteMapping("/{id}")
    public void deleteProduct(@PathVariable Long id) {
        productRepository.deleteById(id);
    }
}