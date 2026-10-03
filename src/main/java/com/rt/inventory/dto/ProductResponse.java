package com.rt.inventory.dto;

public record ProductResponse(
        Long id,
        String name,
        String hsnCode,
        Double purchasePrice,
        Double mrp,
        Double price,
        Double stock,
        Integer piecesPerBox,
        Double piecePurchasePrice,
        Double pieceMrp,
        Double piecePrice,
        String barcode) {
}
