package com.monitor.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Transaction {
    private Long id;
    private String transactionNo;
    private Long amount;
    private Integer status;
    private Long createTime;
    private String merchantId;
    private String orderNo;
}
