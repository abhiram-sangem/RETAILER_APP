package com.rt.inventory;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import com.rt.InventoryLog;
import com.rt.InventoryLogRepository;
import com.rt.inventory.dto.CreateProductRequest;
import com.rt.inventory.dto.ProductResponse;
import com.rt.inventory.dto.UpdateProductRequest;

@Service
public class ProductService {

    private final ProductRepository productRepository;
    private final InventoryLogRepository inventoryLogRepository;

    public ProductService(ProductRepository productRepository, InventoryLogRepository inventoryLogRepository) {
        this.productRepository = productRepository;
        this.inventoryLogRepository = inventoryLogRepository;
    }

    public List<ProductResponse> getAllProducts() {
        return productRepository.findAll().stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public ProductResponse createProduct(CreateProductRequest request) {
        if (request == null || request.name() == null || request.name().trim().isEmpty()) {
            throw new RuntimeException("Product name is required");
        }

        Product product = new Product();
        product.setName(request.name().trim());
        product.setHsnCode(request.hsnCode());
        product.setPurchasePrice(request.purchasePrice());
        product.setMrp(request.mrp() == null ? request.price() : request.mrp());
        product.setPrice(request.price());
        product.setStock(request.stock() == null ? 0.0 : request.stock());
        product.setPiecesPerBox(request.piecesPerBox() == null ? 0 : request.piecesPerBox());
        product.setPiecePurchasePrice(request.piecePurchasePrice());
        product.setPieceMrp(request.pieceMrp());
        product.setPiecePrice(request.piecePrice());
        product.setBarcode(request.barcode());

        Product saved = productRepository.save(product);

        inventoryLogRepository.save(new InventoryLog(
                saved.getId(),
                saved.getName(),
                "NEW_PRODUCT",
                saved.getStock(),
                saved.getStock(),
                "Initial Stock Entry"));

        return toResponse(saved);
    }

    public ProductResponse updateProduct(Long id, UpdateProductRequest details) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Product not found with id: " + id));

        Double oldStock = product.getStock() == null ? 0.0 : product.getStock();
        Double newStock = details.stock() == null ? oldStock : details.stock();

        if (details.name() != null && !details.name().trim().isEmpty()) {
            product.setName(details.name().trim());
        }
        if (details.hsnCode() != null) {
            product.setHsnCode(details.hsnCode());
        }
        if (details.purchasePrice() != null) {
            product.setPurchasePrice(details.purchasePrice());
        }
        if (details.mrp() != null) {
            product.setMrp(details.mrp());
        }
        if (details.price() != null) {
            product.setPrice(details.price());
        }
        if (details.stock() != null) {
            product.setStock(details.stock());
        }
        if (details.piecesPerBox() != null) {
            product.setPiecesPerBox(details.piecesPerBox());
        }
        if (details.piecePurchasePrice() != null) {
            product.setPiecePurchasePrice(details.piecePurchasePrice());
        }
        if (details.pieceMrp() != null) {
            product.setPieceMrp(details.pieceMrp());
        }
        if (details.piecePrice() != null) {
            product.setPiecePrice(details.piecePrice());
        }
        if (details.barcode() != null) {
            product.setBarcode(details.barcode());
        }

        Product saved = productRepository.save(product);

        if (!oldStock.equals(newStock)) {
            inventoryLogRepository.save(new InventoryLog(
                    saved.getId(),
                    saved.getName(),
                    "MANUAL_UPDATE",
                    newStock - oldStock,
                    newStock,
                    "Manual Edit via Products View"));
        }

        return toResponse(saved);
    }

    public List<ProductResponse> createProductsBulk(List<CreateProductRequest> products) {
        List<ProductResponse> savedProducts = new ArrayList<>();

        for (CreateProductRequest p : products) {
            if (p == null || p.name() == null || p.name().trim().isEmpty()) {
                continue;
            }

            Product existing = productRepository.findFirstByName(p.name().trim()).orElse(null);

            if (existing != null) {
                Product updated = mergeIntoExisting(existing, p);
                savedProducts.add(toResponse(productRepository.save(updated)));
            } else {
                Product created = new Product();
                created.setName(p.name().trim());
                created.setHsnCode(p.hsnCode());
                created.setPurchasePrice(p.purchasePrice());
                created.setMrp(p.mrp() == null ? p.price() : p.mrp());
                created.setPrice(p.price());
                created.setStock(p.stock() == null ? 0.0 : p.stock());
                created.setPiecesPerBox(p.piecesPerBox() == null ? 0 : p.piecesPerBox());
                created.setPiecePurchasePrice(p.piecePurchasePrice());
                created.setPieceMrp(p.pieceMrp());
                created.setPiecePrice(p.piecePrice());
                created.setBarcode(p.barcode());

                Product saved = productRepository.save(created);
                savedProducts.add(toResponse(saved));
                inventoryLogRepository.save(new InventoryLog(
                        saved.getId(),
                        saved.getName(),
                        "BULK_IMPORT",
                        saved.getStock(),
                        saved.getStock(),
                        "Imported via Excel"));
            }
        }

        return savedProducts;
    }

    public void deleteProduct(Long id) {
        if (!productRepository.existsById(id)) {
            throw new RuntimeException("Product not found with id: " + id);
        }
        productRepository.deleteById(id);
    }

    private Product mergeIntoExisting(Product existing, CreateProductRequest incoming) {
        if (incoming.hsnCode() != null && !incoming.hsnCode().isEmpty()) {
            existing.setHsnCode(incoming.hsnCode());
        }
        if (incoming.purchasePrice() != null) {
            existing.setPurchasePrice(incoming.purchasePrice());
        }
        if (incoming.mrp() != null) {
            existing.setMrp(incoming.mrp());
        }
        if (incoming.price() != null) {
            existing.setPrice(incoming.price());
        }
        if (incoming.stock() != null) {
            existing.setStock(incoming.stock());
        }
        if (incoming.piecesPerBox() != null) {
            existing.setPiecesPerBox(incoming.piecesPerBox());
        }
        if (incoming.piecePurchasePrice() != null) {
            existing.setPiecePurchasePrice(incoming.piecePurchasePrice());
        }
        if (incoming.pieceMrp() != null) {
            existing.setPieceMrp(incoming.pieceMrp());
        }
        if (incoming.piecePrice() != null) {
            existing.setPiecePrice(incoming.piecePrice());
        }
        if (incoming.barcode() != null && !incoming.barcode().isEmpty()) {
            existing.setBarcode(incoming.barcode());
        }

        return existing;
    }

    private ProductResponse toResponse(Product product) {
        return new ProductResponse(
                product.getId(),
                product.getName(),
                product.getHsnCode(),
                product.getPurchasePrice(),
                product.getMrp(),
                product.getPrice(),
                product.getStock(),
                product.getPiecesPerBox(),
                product.getPiecePurchasePrice(),
                product.getPieceMrp(),
                product.getPiecePrice(),
                product.getBarcode());
    }
}
