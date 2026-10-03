package com.rt.customers.dto;

public record CustomerImportRequest(
        String name,
        String gstno,
        String mobile,
        String city,
        String location,
        Double balance,
        String state) {
}