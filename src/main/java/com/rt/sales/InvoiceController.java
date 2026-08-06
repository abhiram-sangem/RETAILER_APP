package com.rt.sales;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import com.rt.history.InventoryHistory;           // Fixed name
import com.rt.history.InventoryHistoryRepository; // Fixed name
import com.rt.history.InvoiceHistory;             
import com.rt.history.InvoiceHistoryRepository;   
import com.rt.inventory.Product;                  
import com.rt.inventory.ProductRepository;        
import com.rt.customers.Customer;                 
import com.rt.customers.CustomerRepository;       

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

@RestController
@RequestMapping("/api/invoices")
@CrossOrigin(origins = "*")
public class InvoiceController {

    @Autowired
    private InvoiceRepository invoiceRepository;

    @Autowired
    private ProductRepository productRepository;
    
    @Autowired
    private InventoryHistoryRepository inventoryHistoryRepository; // Fixed name
    
    @Autowired
    private InvoiceHistoryRepository invoiceHistoryRepository;

    @Autowired
    private CustomerRepository customerRepository;

    @GetMapping
    public List<Invoice> getAllInvoices() {
        return invoiceRepository.findAll();
    }

    @GetMapping("/{id}")
    public Invoice getInvoiceById(@PathVariable Long id) {
        return invoiceRepository.findById(id).orElseThrow();
    }

    @PostMapping(value = {"", "/create"})
    public Invoice createInvoice(@RequestBody InvoiceRequest request) {
        Invoice invoice = new Invoice();
        invoice.setCustomerName(request.getCustomerName());
        
        if (request.getOrderDate() != null && !request.getOrderDate().trim().isEmpty()) {
            invoice.setOrderDate(LocalDateTime.of(LocalDate.parse(request.getOrderDate().trim()), LocalTime.now()));
        } else {
            invoice.setOrderDate(LocalDateTime.now());
        }

        invoice.setGrossTotal(request.getGrossTotal() != null ? request.getGrossTotal() : 0.0);
        invoice.setDiscountPercent(request.getDiscountPercent() != null ? request.getDiscountPercent() : 0.0);
        invoice.setCgst(request.getCgst() != null ? request.getCgst() : 0.0);
        invoice.setSgst(request.getSgst() != null ? request.getSgst() : 0.0);
        
        Double finalTotal = request.getFinalTotal() != null ? request.getFinalTotal() : 0.0;
        invoice.setFinalTotal(finalTotal);
        
        String paymentMethod = request.getPaymentMethod() != null ? request.getPaymentMethod() : "Cash";
        invoice.setPaymentMethod(paymentMethod);

        List<InvoiceItem> items = new ArrayList<>();
        if (request.getCartItems() != null) {
            for (InvoiceRequest.CartItemRequest itemReq : request.getCartItems()) {
                Product product = productRepository.findById(itemReq.getId()).orElseThrow();
                int qty = itemReq.getQuantity() != null ? itemReq.getQuantity() : 1;
                
                product.setStock(Math.max(0, (product.getStock() == null ? 0 : product.getStock()) - qty));
                productRepository.save(product);

                InvoiceItem item = new InvoiceItem();
                item.setProduct(product);
                item.setQuantity(qty);
                item.setPrice(itemReq.getPrice() != null ? itemReq.getPrice() : product.getPrice());
                item.setInvoice(invoice);
                items.add(item);
            }
        }
        invoice.setItems(items);
        Invoice savedInvoice = invoiceRepository.save(invoice);
        
        for (InvoiceItem item : savedInvoice.getItems()) {
            // FIXED: Using safe setters instead of broken constructor
            InventoryHistory log = new InventoryHistory();
            log.setProductId(item.getProduct().getId());
            log.setProductName(item.getProduct().getName());
            log.setActionType("SALE");
            log.setQuantityChanged(-item.getQuantity());
            log.setFinalStock(item.getProduct().getStock());
            log.setDescription("Sale Bill #" + savedInvoice.getId());
            log.setTimestamp(LocalDateTime.now());
            inventoryHistoryRepository.save(log);
        }

        // ==========================================
        // LEDGER LOGIC: If Pay Later, increase dues
        // ==========================================
        if ("Pay Later".equalsIgnoreCase(paymentMethod)) {
            List<Customer> customers = customerRepository.findByName(request.getCustomerName());
            if (customers != null && !customers.isEmpty()) {
                Customer customer = customers.get(0); // Safely get the first match
                Double currentBalance = customer.getBalance() != null ? customer.getBalance() : 0.0;
                customer.setBalance(currentBalance + finalTotal);
                customerRepository.save(customer);
            }
        }

        return savedInvoice;
    }

    @PutMapping("/{id}")
    public Invoice updateInvoice(@PathVariable Long id, @RequestBody InvoiceRequest request) {
        Invoice invoice = invoiceRepository.findById(id).orElseThrow();

        InvoiceHistory history = new InvoiceHistory();
        history.setOriginalInvoiceId(invoice.getId());
        history.setCustomerName(invoice.getCustomerName());
        history.setOldFinalTotal(invoice.getFinalTotal());
        history.setEditDate(LocalDateTime.now());
        
        StringBuilder oldJson = new StringBuilder("[");
        for (int i = 0; i < invoice.getItems().size(); i++) {
            InvoiceItem item = invoice.getItems().get(i);
            oldJson.append(String.format("{\"name\":\"%s\", \"qty\":%d, \"price\":%f}", 
                item.getProduct().getName().replace("\"", "\\\""), 
                item.getQuantity(), 
                item.getPrice()));
            if (i < invoice.getItems().size() - 1) oldJson.append(",");
        }
        oldJson.append("]");
        history.setOldItemsJson(oldJson.toString());

        // Revert Old Inventory
        for (InvoiceItem oldItem : invoice.getItems()) {
            Product p = oldItem.getProduct();
            p.setStock((p.getStock() == null ? 0 : p.getStock()) + oldItem.getQuantity());
            productRepository.save(p);
            
            // FIXED
            InventoryHistory log = new InventoryHistory();
            log.setProductId(p.getId());
            log.setProductName(p.getName());
            log.setActionType("EDIT_REVERT");
            log.setQuantityChanged(oldItem.getQuantity());
            log.setFinalStock(p.getStock());
            log.setDescription("Revert Bill #" + invoice.getId() + " for Edit");
            log.setTimestamp(LocalDateTime.now());
            inventoryHistoryRepository.save(log);
        }
        invoice.getItems().clear();

        invoice.setCustomerName(request.getCustomerName());
        invoice.setGrossTotal(request.getGrossTotal() != null ? request.getGrossTotal() : 0.0);
        invoice.setDiscountPercent(request.getDiscountPercent() != null ? request.getDiscountPercent() : 0.0);
        invoice.setCgst(request.getCgst() != null ? request.getCgst() : 0.0);
        invoice.setSgst(request.getSgst() != null ? request.getSgst() : 0.0);
        invoice.setFinalTotal(request.getFinalTotal() != null ? request.getFinalTotal() : 0.0);
        invoice.setPaymentMethod(request.getPaymentMethod() != null ? request.getPaymentMethod() : invoice.getPaymentMethod());

        LocalDateTime originalDateTime = invoice.getOrderDate();
        if (request.getOrderDate() != null && !request.getOrderDate().trim().isEmpty()) {
            LocalDate requestedDate = LocalDate.parse(request.getOrderDate().trim());
            invoice.setOrderDate(originalDateTime != null ? LocalDateTime.of(requestedDate, originalDateTime.toLocalTime()) : LocalDateTime.of(requestedDate, LocalTime.now()));
        }

        StringBuilder newJson = new StringBuilder("[");
        if (request.getCartItems() != null) {
            for (int i = 0; i < request.getCartItems().size(); i++) {
                InvoiceRequest.CartItemRequest itemReq = request.getCartItems().get(i);
                Product product = productRepository.findById(itemReq.getId()).orElseThrow();
                int qty = itemReq.getQuantity() != null ? itemReq.getQuantity() : 1;
                Double appliedPrice = itemReq.getPrice() != null ? itemReq.getPrice() : product.getPrice();
                
                product.setStock(Math.max(0, (product.getStock() == null ? 0 : product.getStock()) - qty));
                productRepository.save(product);

                InvoiceItem item = new InvoiceItem();
                item.setProduct(product);
                item.setQuantity(qty);
                item.setPrice(appliedPrice);
                item.setInvoice(invoice);
                invoice.getItems().add(item);
                
                newJson.append(String.format("{\"name\":\"%s\", \"qty\":%d, \"price\":%f}", 
                    product.getName().replace("\"", "\\\""), 
                    qty, 
                    appliedPrice));
                if (i < request.getCartItems().size() - 1) newJson.append(",");
                
                // FIXED
                InventoryHistory log = new InventoryHistory();
                log.setProductId(product.getId());
                log.setProductName(product.getName());
                log.setActionType("EDIT_APPLY");
                log.setQuantityChanged(-qty);
                log.setFinalStock(product.getStock());
                log.setDescription("Apply New Items to Bill #" + invoice.getId());
                log.setTimestamp(LocalDateTime.now());
                inventoryHistoryRepository.save(log);
            }
        }
        newJson.append("]");
        
        Invoice savedInvoice = invoiceRepository.save(invoice);
        
        history.setNewFinalTotal(savedInvoice.getFinalTotal());
        history.setNewItemsJson(newJson.toString());
        invoiceHistoryRepository.save(history);

        return savedInvoice;
    }

    @PostMapping("/{id}/return")
    public Invoice returnInvoice(@PathVariable Long id, @RequestBody InvoiceRequest request) {
        Invoice originalInvoice = invoiceRepository.findById(id).orElseThrow();

        Invoice returnInvoice = new Invoice();
        returnInvoice.setCustomerName(originalInvoice.getCustomerName() + " (Returned)");
        returnInvoice.setOrderDate(LocalDateTime.now());
        returnInvoice.setPaymentMethod(originalInvoice.getPaymentMethod());
        returnInvoice.setIsReturn(true);
        returnInvoice.setOriginalInvoiceId(originalInvoice.getId());

        Double returnGross = request.getGrossTotal() != null ? request.getGrossTotal() : 0.0;
        Double returnCgst = request.getCgst() != null ? request.getCgst() : 0.0;
        Double returnSgst = request.getSgst() != null ? request.getSgst() : 0.0;
        Double returnFinal = request.getFinalTotal() != null ? request.getFinalTotal() : 0.0;

        returnInvoice.setGrossTotal(-returnGross);
        returnInvoice.setDiscountPercent(request.getDiscountPercent() != null ? request.getDiscountPercent() : 0.0);
        returnInvoice.setCgst(-returnCgst);
        returnInvoice.setSgst(-returnSgst);
        returnInvoice.setFinalTotal(-returnFinal);

        List<InvoiceItem> returnItems = new ArrayList<>();
        if (request.getCartItems() != null) {
            for (InvoiceRequest.CartItemRequest itemReq : request.getCartItems()) {
                Product product = productRepository.findById(itemReq.getId()).orElseThrow();
                int qtyToReturn = itemReq.getQuantity() != null ? itemReq.getQuantity() : 1;
                
                product.setStock((product.getStock() == null ? 0 : product.getStock()) + qtyToReturn);
                productRepository.save(product);

                InvoiceItem item = new InvoiceItem();
                item.setProduct(product);
                item.setQuantity(-qtyToReturn);
                item.setPrice(itemReq.getPrice() != null ? itemReq.getPrice() : product.getPrice());
                item.setInvoice(returnInvoice);
                returnItems.add(item);
                
                // FIXED
                InventoryHistory log = new InventoryHistory();
                log.setProductId(product.getId());
                log.setProductName(product.getName());
                log.setActionType("RETURN");
                log.setQuantityChanged(qtyToReturn);
                log.setFinalStock(product.getStock());
                log.setDescription("Return from Bill #" + originalInvoice.getId());
                log.setTimestamp(LocalDateTime.now());
                inventoryHistoryRepository.save(log);
            }
        }
        returnInvoice.setItems(returnItems);

        // ==========================================
        // LEDGER LOGIC: Decrease dues if returning a Pay Later bill
        // ==========================================
        if ("Pay Later".equalsIgnoreCase(originalInvoice.getPaymentMethod())) {
            List<Customer> customers = customerRepository.findByName(originalInvoice.getCustomerName());
            if (customers != null && !customers.isEmpty()) {
                Customer customer = customers.get(0);
                Double currentBalance = customer.getBalance() != null ? customer.getBalance() : 0.0;
                // Subtract the amount being returned from their debt
                customer.setBalance(currentBalance - returnFinal);
                customerRepository.save(customer);
            }
        }

        return invoiceRepository.save(returnInvoice);
    }

    public static class InvoiceRequest {
        private String customerName;
        private List<CartItemRequest> cartItems;
        private Double grossTotal;
        private Double discountPercent;
        private Double cgst;
        private Double sgst;
        private Double finalTotal;
        private String paymentMethod;
        private String orderDate;

        public String getCustomerName() { return customerName; }
        public void setCustomerName(String customerName) { this.customerName = customerName; }
        public List<CartItemRequest> getCartItems() { return cartItems; }
        public void setCartItems(List<CartItemRequest> cartItems) { this.cartItems = cartItems; }
        public Double getGrossTotal() { return grossTotal; }
        public void setGrossTotal(Double grossTotal) { this.grossTotal = grossTotal; }
        public Double getDiscountPercent() { return discountPercent; }
        public void setDiscountPercent(Double discountPercent) { this.discountPercent = discountPercent; }
        public Double getCgst() { return cgst; }
        public void setCgst(Double cgst) { this.cgst = cgst; }
        public Double getSgst() { return sgst; }
        public void setSgst(Double sgst) { this.sgst = sgst; }
        public Double getFinalTotal() { return finalTotal; }
        public void setFinalTotal(Double finalTotal) { this.finalTotal = finalTotal; }
        public String getPaymentMethod() { return paymentMethod; }
        public void setPaymentMethod(String paymentMethod) { this.paymentMethod = paymentMethod; }
        public String getOrderDate() { return orderDate; }
        public void setOrderDate(String orderDate) { this.orderDate = orderDate; }

        public static class CartItemRequest {
            private Long id;
            private Integer quantity;
            private Double price;

            public Long getId() { return id; }
            public void setId(Long id) { this.id = id; }
            public Integer getQuantity() { return quantity; }
            public void setQuantity(Integer quantity) { this.quantity = quantity; }
            public Double getPrice() { return price; }
            public void setPrice(Double price) { this.price = price; }
        }
    }
}