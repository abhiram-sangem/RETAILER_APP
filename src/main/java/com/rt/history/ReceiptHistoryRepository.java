package com.rt.history;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ReceiptHistoryRepository extends JpaRepository<ReceiptHistory, Long> {
    List<ReceiptHistory> findAllByOrderByEditDateDesc();
}