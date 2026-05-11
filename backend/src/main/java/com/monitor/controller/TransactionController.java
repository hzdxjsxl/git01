package com.monitor.controller;

import com.monitor.dto.TransactionCursorRequest;
import com.monitor.dto.TransactionCursorResponse;
import com.monitor.service.TransactionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/transactions")
@CrossOrigin(origins = "*")
public class TransactionController {
    
    @Autowired
    private TransactionService transactionService;
    
    @PostMapping("/cursor")
    public TransactionCursorResponse getByCursor(@RequestBody TransactionCursorRequest request) {
        return transactionService.getTransactionsByCursor(
                request.getCursor(),
                request.getSize()
        );
    }
    
    @GetMapping("/latest")
    public Map<String, Object> getLatest() {
        Long maxId = transactionService.getMaxId();
        TransactionCursorResponse response = transactionService.getTransactionsByCursor(null, 100);
        
        Map<String, Object> result = new HashMap<>();
        result.put("maxId", maxId);
        result.put("data", response.getData());
        result.put("nextCursor", response.getNextCursor());
        result.put("hasMore", response.isHasMore());
        return result;
    }
}
