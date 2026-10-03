package com.rt.customers.dto;

public record CustomerResponse(
        Long id,
        String name,
        String gstno,
        String mobile,
        String city,
        String location,
        Double balance,
        String state) {
}