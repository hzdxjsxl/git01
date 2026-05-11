package com.monitor.mapper;

import com.monitor.entity.Transaction;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface TransactionMapper {
    
    List<Transaction> selectByCursor(@Param("cursor") Long cursor, @Param("size") Integer size);
    
    Long selectMaxId();
}
