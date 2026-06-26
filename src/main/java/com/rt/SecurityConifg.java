package com.rt;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableWebSecurity
public class SecurityConifg {

    @Bean
    public BCryptPasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable()) // Disabled for simplicity with REST APIs
            .authorizeHttpRequests(auth -> auth
                
                .requestMatchers("/","index.html", "/static/**", "/*.js", "/*.css", "/*.json", "/favicon.ico").permitAll()
                
                .requestMatchers("/api/auth/login").permitAll() // Anyone can try to log in
                .anyRequest().authenticated() // All retailer data endpoints are locked
            );
        
        return http.build();
    }

}
