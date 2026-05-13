import { computeDiff, getSideBySideLines } from '../algorithms/myersDiff.js';

self.onmessage = function(e) {
  const { type, payload } = e.data;
  
  if (type === 'COMPUTE_DIFF') {
    const { oldText, newText } = payload;
    
    try {
      self.postMessage({ type: 'PROGRESS', payload: { stage: 'started', message: '开始计算差异...' } });
      
      const startTime = performance.now();
      
      self.postMessage({ type: 'PROGRESS', payload: { stage: 'computing', message: '执行Myers Diff算法...' } });
      
      const result = computeDiff(oldText, newText);
      
      self.postMessage({ type: 'PROGRESS', payload: { stage: 'formatting', message: '格式化输出...' } });
      
      const sideBySide = getSideBySideLines(result.operations);
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      self.postMessage({
        type: 'DIFF_COMPLETE',
        payload: {
          ...result,
          sideBySide,
          duration,
          timestamp: Date.now()
        }
      });
      
    } catch (error) {
      self.postMessage({
        type: 'DIFF_ERROR',
        payload: {
          message: error.message,
          stack: error.stack
        }
      });
    }
  }
};
