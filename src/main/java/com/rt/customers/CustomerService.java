package com.rt.customers;

import java.util.ArrayList;
import java.util.List;

import org.springframework.stereotype.Service;

@Service
public class CustomerService {

    private final CustomerRepository customerRepository;

    public CustomerService(CustomerRepository customerRepository) {
        this.customerRepository = customerRepository;
    }

    public List<Customer> getAllCustomers() {
        return customerRepository.findAll();
    }

    public Customer createCustomer(Customer customer) {
        validateCustomer(customer);

        customer.setId(null);
        return customerRepository.save(customer);
    }

    public List<Customer> createCustomersBulk(List<Customer> customers) {
        List<Customer> savedCustomers = new ArrayList<>();

        for (Customer incoming : customers) {
            if (incoming == null) {
                continue;
            }

            if (incoming.getName() == null || incoming.getName().trim().isEmpty()) {
                continue;
            }

            Customer existing = findExistingCustomer(incoming);

            if (existing != null) {
                applyCustomerUpdate(existing, incoming);
                savedCustomers.add(customerRepository.save(existing));
            } else {
                Customer newCustomer = new Customer();
                newCustomer.setName(incoming.getName().trim());
                newCustomer.setGstno(incoming.getGstno());
                newCustomer.setMobile(incoming.getMobile());
                newCustomer.setCity(incoming.getCity());
                newCustomer.setLocation(incoming.getLocation());
                newCustomer.setState(incoming.getState());
                newCustomer.setBalance(incoming.getBalance());
                savedCustomers.add(customerRepository.save(newCustomer));
            }
        }

        return savedCustomers;
    }

    public Customer updateCustomer(Long id, Customer customerDetails) {
        Customer customer = customerRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Customer not found with id: " + id));

        if (customerDetails.getName() != null && !customerDetails.getName().trim().isEmpty()) {
            customer.setName(customerDetails.getName().trim());
        }
        if (customerDetails.getGstno() != null) {
            customer.setGstno(customerDetails.getGstno());
        }
        if (customerDetails.getMobile() != null) {
            customer.setMobile(customerDetails.getMobile());
        }
        if (customerDetails.getCity() != null) {
            customer.setCity(customerDetails.getCity());
        }
        if (customerDetails.getLocation() != null) {
            customer.setLocation(customerDetails.getLocation());
        }
        if (customerDetails.getState() != null) {
            customer.setState(customerDetails.getState());
        }
        if (customerDetails.getBalance() != null) {
            customer.setBalance(customerDetails.getBalance());
        }

        return customerRepository.save(customer);
    }

    public void deleteCustomer(Long id) {
        if (!customerRepository.existsById(id)) {
            throw new RuntimeException("Customer not found with id: " + id);
        }
        customerRepository.deleteById(id);
    }

    private void validateCustomer(Customer customer) {
        if (customer == null) {
            throw new RuntimeException("Customer cannot be null");
        }

        if (customer.getName() == null || customer.getName().trim().isEmpty()) {
            throw new RuntimeException("Customer name is required");
        }
    }

    private Customer findExistingCustomer(Customer incoming) {
        if (incoming.getMobile() != null && !incoming.getMobile().trim().isEmpty()) {
            String mobile = incoming.getMobile().trim();
            return customerRepository.findAll().stream()
                    .filter(customer -> mobile.equals(customer.getMobile()))
                    .findFirst()
                    .orElse(null);
        }

        if (incoming.getName() != null && !incoming.getName().trim().isEmpty()) {
            String name = incoming.getName().trim();
            return customerRepository.findAll().stream()
                    .filter(customer -> name.equals(customer.getName()))
                    .findFirst()
                    .orElse(null);
        }

        return null;
    }

    private void applyCustomerUpdate(Customer existing, Customer incoming) {
        if (incoming.getGstno() != null && !incoming.getGstno().isEmpty()) {
            existing.setGstno(incoming.getGstno());
        }
        if (incoming.getMobile() != null && !incoming.getMobile().isEmpty()) {
            existing.setMobile(incoming.getMobile());
        }
        if (incoming.getCity() != null && !incoming.getCity().isEmpty()) {
            existing.setCity(incoming.getCity());
        }
        if (incoming.getLocation() != null && !incoming.getLocation().isEmpty()) {
            existing.setLocation(incoming.getLocation());
        }
        if (incoming.getState() != null && !incoming.getState().isEmpty()) {
            existing.setState(incoming.getState());
        }
        if (incoming.getBalance() != null) {
            existing.setBalance(incoming.getBalance());
        }
    }
}
