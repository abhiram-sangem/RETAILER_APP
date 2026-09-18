package com.rt.vendors;

import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/vendors")
@CrossOrigin(origins = "http://localhost:5173") // Locked specifically to your Vite port for safety
public class VendorController {

    @Autowired
    private VendorRepository vendorRepository;

    @GetMapping
    public List<Vendor> getAllVendors() {
        return vendorRepository.findAll();
    }

    @PostMapping
    public Vendor addVendor(@RequestBody Vendor vendor) {
        if (vendor.getBalance() == null) vendor.setBalance(0.0);
        return vendorRepository.save(vendor);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Vendor> updateVendor(@PathVariable Long id, @RequestBody Vendor details) {
        return vendorRepository.findById(id).map(vendor -> {
            vendor.setName(details.getName());
            vendor.setPhone(details.getPhone());
            vendor.setGstno(details.getGstno());
            vendor.setAddress(details.getAddress());
            vendor.setCity(details.getCity());
            if (details.getBalance() != null) vendor.setBalance(details.getBalance());
            return ResponseEntity.ok(vendorRepository.save(vendor));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public void deleteVendor(@PathVariable Long id) {
        vendorRepository.deleteById(id);
    }
}