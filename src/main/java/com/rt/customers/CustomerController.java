package com.rt.customers;

import java.util.ArrayList;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/customers")
@CrossOrigin(origins = "*")
public class CustomerController {

    @Autowired
    private CustomerRepository customerRepository;

    @GetMapping
    public ResponseEntity<List<Customer>> getAllCustomers() {
        return ResponseEntity.ok(customerRepository.findAll());
    }

    @PostMapping
    public ResponseEntity<Customer> addCustomer(@RequestBody Customer customer) {
        if (customer.getName() == null || customer.getName().trim().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        customer.setId(null); // Safe-guard
        return ResponseEntity.ok(customerRepository.save(customer));
    }

    @PostMapping("/bulk")
    public ResponseEntity<List<Customer>> addCustomersBulk(@RequestBody List<Customer> customers) {
        List<Customer> savedCustomers = new ArrayList<>();
        
        for (Customer c : customers) {
            if (c.getName() == null || c.getName().trim().isEmpty()) continue;
            
            Customer existing = null;
            
            if (c.getMobile() != null && !c.getMobile().trim().isEmpty()) {
                String mobile = c.getMobile().trim();
                existing = customerRepository.findAll().stream()
                        .filter(cust -> mobile.equals(cust.getMobile()))
                        .findFirst().orElse(null);
            }
            if (existing == null) {
                String name = c.getName().trim();
                existing = customerRepository.findAll().stream()
                        .filter(cust -> name.equals(cust.getName()))
                        .findFirst().orElse(null);
            }
            
            if (existing != null) {
                if (c.getGstno() != null && !c.getGstno().isEmpty()) existing.setGstno(c.getGstno());
                if (c.getMobile() != null && !c.getMobile().isEmpty()) existing.setMobile(c.getMobile());
                if (c.getCity() != null && !c.getCity().isEmpty()) existing.setCity(c.getCity());
                if (c.getLocation() != null && !c.getLocation().isEmpty()) existing.setLocation(c.getLocation());
                if (c.getState() != null && !c.getState().isEmpty()) existing.setState(c.getState());
                if (c.getBalance() != null) existing.setBalance(c.getBalance());
                
                savedCustomers.add(customerRepository.save(existing));
            } else {
                c.setId(null); 
                savedCustomers.add(customerRepository.save(c));
            }
        }
        return ResponseEntity.ok(savedCustomers);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Customer> updateCustomer(@PathVariable Long id, @RequestBody Customer customerDetails) {
        return customerRepository.findById(id)
                .map(customer -> {
                    if (customerDetails.getName() != null) customer.setName(customerDetails.getName());
                    if (customerDetails.getGstno() != null) customer.setGstno(customerDetails.getGstno());
                    if (customerDetails.getMobile() != null) customer.setMobile(customerDetails.getMobile());
                    if (customerDetails.getCity() != null) customer.setCity(customerDetails.getCity());
                    if (customerDetails.getLocation() != null) customer.setLocation(customerDetails.getLocation());
                    if (customerDetails.getBalance() != null) customer.setBalance(customerDetails.getBalance());
                    if (customerDetails.getState() != null) customer.setState(customerDetails.getState());
                    
                    return ResponseEntity.ok(customerRepository.save(customer));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteCustomer(@PathVariable Long id) {
        if (customerRepository.existsById(id)) {
            customerRepository.deleteById(id);
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.notFound().build();
    }
}