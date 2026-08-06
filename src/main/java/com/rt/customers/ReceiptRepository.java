package com.rt.customers;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ReceiptRepository extends JpaRepository<Receipt, Long> {
    List<Receipt> findAllByOrderByReceiptDateDesc();
    List<Receipt> findByCustomerIdOrderByReceiptDateDesc(Long customerId);
}