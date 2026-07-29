package com.rt;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface InventoryLogRepository extends JpaRepository<InventoryLog, Long> {
    List<InventoryLog> findAllByOrderByTimestampDesc();
}