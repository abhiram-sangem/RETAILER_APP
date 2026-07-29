package com.rt;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface InvoiceHistoryRepository extends JpaRepository<InvoiceHistory, Long> {
    List<InvoiceHistory> findAllByOrderByEditDateDesc();
}