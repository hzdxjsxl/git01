const express = require('express');
const router = express.Router();
const mockDataGenerator = require('../utils/mockDataGenerator');

const TOTAL_RECORDS = 1000000;
const DEFAULT_PAGE_SIZE = 1000;
const MAX_PAGE_SIZE = 5000;

router.get('/', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const pageSize = Math.min(parseInt(req.query.pageSize) || DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
  const startTime = req.query.startTime ? parseInt(req.query.startTime) : null;
  const endTime = req.query.endTime ? parseInt(req.query.endTime) : null;
  const sessionId = req.query.sessionId || null;

  const startIndex = (page - 1) * pageSize;

  if (startIndex >= TOTAL_RECORDS) {
    return res.json({
      data: [],
      pagination: {
        page,
        pageSize,
        totalRecords: TOTAL_RECORDS,
        totalPages: Math.ceil(TOTAL_RECORDS / pageSize),
        hasNext: false
      }
    });
  }

  const records = mockDataGenerator.generateRecords(startIndex, pageSize, {
    startTime,
    endTime,
    sessionId
  });

  res.json({
    data: records,
    pagination: {
      page,
      pageSize,
      totalRecords: TOTAL_RECORDS,
      totalPages: Math.ceil(TOTAL_RECORDS / pageSize),
      hasNext: startIndex + pageSize < TOTAL_RECORDS
    }
  });
});

router.get('/stats', (req, res) => {
  res.json({
    totalRecords: TOTAL_RECORDS,
    maxPageSize: MAX_PAGE_SIZE,
    defaultPageSize: DEFAULT_PAGE_SIZE
  });
});

module.exports = router;