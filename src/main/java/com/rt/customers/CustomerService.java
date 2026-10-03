package com.rt.customers;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import com.rt.customers.dto.CreateCustomerRequest;
import com.rt.customers.dto.CustomerImportRequest;
import com.rt.customers.dto.CustomerResponse;
import com.rt.customers.dto.UpdateCustomerRequest;

@Service
public class CustomerService {

    private final CustomerRepository customerRepository;

    public CustomerService(CustomerRepository customerRepository) {
        this.customerRepository = customerRepository;
    }

    public List<CustomerResponse> getAllCustomers() {
        return customerRepository.findAll().stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public CustomerResponse createCustomer(CreateCustomerRequest request) {
        validateCustomerName(request == null ? null : request.name());

        Customer customer = new Customer();
        customer.setName(request.name().trim());
        customer.setGstno(request.gstno());
        customer.setMobile(request.mobile());
        customer.setCity(request.city());
        customer.setLocation(request.location());
        customer.setState(request.state());

        return toResponse(customerRepository.save(customer));
    }

    public List<CustomerResponse> createCustomersBulk(List<CustomerImportRequest> customers) {
        List<CustomerResponse> savedCustomers = new ArrayList<>();

        for (CustomerImportRequest incoming : customers) {
            if (incoming == null) {
                continue;
            }

            if (incoming.name() == null || incoming.name().trim().isEmpty()) {
                continue;
            }

            Customer existing = findExistingCustomer(incoming);

            if (existing != null) {
                applyCustomerUpdate(existing, incoming);
                savedCustomers.add(toResponse(customerRepository.save(existing)));
            } else {
                Customer newCustomer = new Customer();
                newCustomer.setName(incoming.name().trim());
                newCustomer.setGstno(incoming.gstno());
                newCustomer.setMobile(incoming.mobile());
                newCustomer.setCity(incoming.city());
                newCustomer.setLocation(incoming.location());
                newCustomer.setState(incoming.state());
                newCustomer.setBalance(incoming.balance());
                savedCustomers.add(toResponse(customerRepository.save(newCustomer)));
            }
        }

        return savedCustomers;
    }

    public CustomerResponse updateCustomer(Long id, UpdateCustomerRequest customerDetails) {
        Customer customer = customerRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Customer not found with id: " + id));

        if (customerDetails.name() != null && !customerDetails.name().trim().isEmpty()) {
            customer.setName(customerDetails.name().trim());
        }
        if (customerDetails.gstno() != null) {
            customer.setGstno(customerDetails.gstno());
        }
        if (customerDetails.mobile() != null) {
            customer.setMobile(customerDetails.mobile());
        }
        if (customerDetails.city() != null) {
            customer.setCity(customerDetails.city());
        }
        if (customerDetails.location() != null) {
            customer.setLocation(customerDetails.location());
        }
        if (customerDetails.state() != null) {
            customer.setState(customerDetails.state());
        }

        return toResponse(customerRepository.save(customer));
    }

    public void deleteCustomer(Long id) {
        if (!customerRepository.existsById(id)) {
            throw new RuntimeException("Customer not found with id: " + id);
        }
        customerRepository.deleteById(id);
    }

    private void validateCustomerName(String name) {
        if (name == null || name.trim().isEmpty()) {
            throw new RuntimeException("Customer name is required");
        }
    }

    private Customer findExistingCustomer(CustomerImportRequest incoming) {
        if (incoming.mobile() != null && !incoming.mobile().trim().isEmpty()) {
            String mobile = incoming.mobile().trim();
            return customerRepository.findAll().stream()
                    .filter(customer -> mobile.equals(customer.getMobile()))
                    .findFirst()
                    .orElse(null);
        }

        if (incoming.name() != null && !incoming.name().trim().isEmpty()) {
            String name = incoming.name().trim();
            return customerRepository.findAll().stream()
                    .filter(customer -> name.equals(customer.getName()))
                    .findFirst()
                    .orElse(null);
        }

        return null;
    }

    private void applyCustomerUpdate(Customer existing, CustomerImportRequest incoming) {
        if (incoming.gstno() != null && !incoming.gstno().isEmpty()) {
            existing.setGstno(incoming.gstno());
        }
        if (incoming.mobile() != null && !incoming.mobile().isEmpty()) {
            existing.setMobile(incoming.mobile());
        }
        if (incoming.city() != null && !incoming.city().isEmpty()) {
            existing.setCity(incoming.city());
        }
        if (incoming.location() != null && !incoming.location().isEmpty()) {
            existing.setLocation(incoming.location());
        }
        if (incoming.state() != null && !incoming.state().isEmpty()) {
            existing.setState(incoming.state());
        }
        if (incoming.balance() != null) {
            existing.setBalance(incoming.balance());
        }
    }

    private CustomerResponse toResponse(Customer customer) {
        return new CustomerResponse(
                customer.getId(),
                customer.getName(),
                customer.getGstno(),
                customer.getMobile(),
                customer.getCity(),
                customer.getLocation(),
                customer.getBalance(),
                customer.getState());
    }
}
