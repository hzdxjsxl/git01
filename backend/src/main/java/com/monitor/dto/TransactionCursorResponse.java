package com.monitor.dto;

import com.monitor.entity.Transaction;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TransactionCursorResponse {
    private List<Transaction> data;
    private Long nextCursor;
    private boolean hasMore;
}
