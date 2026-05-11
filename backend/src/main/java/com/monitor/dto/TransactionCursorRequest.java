package com.monitor.dto;

import lombok.Data;

@Data
public class TransactionCursorRequest {
    private Long cursor;
    private Integer size = 100;
}
