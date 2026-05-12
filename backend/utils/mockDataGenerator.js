const PAGES = [
  '/home',
  '/products',
  '/products/list',
  '/products/detail',
  '/cart',
  '/checkout',
  '/checkout/payment',
  '/checkout/success',
  '/user/profile',
  '/user/orders',
  '/search',
  '/about',
  '/contact',
  '/blog',
  '/blog/post'
];

function generateSessionId(index) {
  const sessionNum = Math.floor(index / 20) + 1;
  return `session_${sessionNum.toString().padStart(8, '0')}`;
}

function generateTimestamp(index, baseTime = Date.now()) {
  return baseTime - (1000000 - index) * 1000;
}

function generatePagePath(index, sessionPageIndex) {
  if (sessionPageIndex === 0) {
    return '/home';
  }
  
  const lastPage = PAGES[(sessionPageIndex - 1) % PAGES.length];
  const behaviorPattern = sessionPageIndex % 5;
  
  if (behaviorPattern === 0) {
    return '/search';
  } else if (behaviorPattern === 1) {
    return Math.random() > 0.5 ? '/products/list' : '/products/detail';
  } else if (behaviorPattern === 2) {
    return '/cart';
  } else if (behaviorPattern === 3) {
    return '/checkout';
  } else {
    return PAGES[Math.floor(Math.random() * PAGES.length)];
  }
}

function generateRecords(startIndex, count, filters = {}) {
  const records = [];
  const baseTime = Date.now();
  
  for (let i = 0; i < count; i++) {
    const globalIndex = startIndex + i;
    const sessionId = generateSessionId(globalIndex);
    const sessionPageIndex = globalIndex % 20;
    
    const record = {
      sessionId,
      pagePath: generatePagePath(globalIndex, sessionPageIndex),
      timestamp: generateTimestamp(globalIndex, baseTime),
      sequence: sessionPageIndex
    };
    
    if (filters.sessionId && record.sessionId !== filters.sessionId) {
      continue;
    }
    
    if (filters.startTime && record.timestamp < filters.startTime) {
      continue;
    }
    
    if (filters.endTime && record.timestamp > filters.endTime) {
      continue;
    }
    
    records.push(record);
  }
  
  return records.sort((a, b) => {
    if (a.sessionId === b.sessionId) {
      return a.sequence - b.sequence;
    }
    return b.timestamp - a.timestamp;
  });
}

module.exports = {
  generateRecords,
  PAGES
};