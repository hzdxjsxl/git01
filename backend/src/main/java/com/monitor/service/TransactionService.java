package com.monitor.service;

import com.monitor.dto.TransactionCursorResponse;
import com.monitor.entity.Transaction;
import com.monitor.mapper.TransactionMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class TransactionService {
    
    @Autowired
    private TransactionMapper transactionMapper;
    
    public TransactionCursorResponse getTransactionsByCursor(Long cursor, Integer size) {
        if (size == null || size <= 0) {
            size = 100;
        }
        if (size > 500) {
            size = 500;
        }
        
        List<Transaction> data = transactionMapper.selectByCursor(cursor, size);
        boolean hasMore = data.size() == size;
        Long nextCursor = hasMore ? data.get(data.size() - 1).getId() : null;
        
        return TransactionCursorResponse.builder()
                .data(data)
                .nextCursor(nextCursor)
                .hasMore(hasMore)
                .build();
    }
    
    public Long getMaxId() {
        return transactionMapper.selectMaxId();
    }
}
