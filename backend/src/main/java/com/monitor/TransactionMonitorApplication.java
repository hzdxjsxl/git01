package com.monitor;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
@MapperScan("com.monitor.mapper")
public class TransactionMonitorApplication {
    public static void main(String[] args) {
        SpringApplication.run(TransactionMonitorApplication.class, args);
    }
}
