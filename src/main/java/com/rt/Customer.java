package com.rt;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "customers")
public class Customer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false)
    private String name;

    private String gstno;
    private String mobile;
    private String city;
    
    // --- NEW FIELDS ---
    private String location;
    private Double balance;
    private String state;

    public Customer() {
    }

    public Customer(String name) {
        this.name = name;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getGstno() { return gstno; }
    public void setGstno(String gstno) { this.gstno = gstno; }

    public String getMobile() { return mobile; }
    public void setMobile(String mobile) { this.mobile = mobile; }

    public String getCity() { return city; }
    public void setCity(String city) { this.city = city; }

    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }

    public Double getBalance() { return balance; }
    public void setBalance(Double balance) { this.balance = balance; }

    public String getState() { return state; }
    public void setState(String state) { this.state = state; }
}