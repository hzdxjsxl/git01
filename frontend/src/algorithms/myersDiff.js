export const OperationType = {
  EQUAL: 'equal',
  DELETE: 'delete',
  INSERT: 'insert',
  REPLACE: 'replace'
};

export function computeDiff(oldText, newText) {
  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');
  
  const n = oldLines.length;
  const m = newLines.length;
  
  const max = n + m;
  
  const v = new Array(2 * max + 1);
  const trace = [];
  
  let found = false;
  
  for (let d = 0; d <= max; d++) {
    const vCopy = [...v];
    trace.push(vCopy);
    
    for (let k = -d; k <= d; k += 2) {
      let x;
      
      if (k === -d || (k !== d && v[k - 1 + max] < v[k + 1 + max])) {
        x = v[k + 1 + max] || 0;
      } else {
        x = (v[k - 1 + max] || 0) + 1;
      }
      
      let y = x - k;
      
      while (x < n && y < m && oldLines[x] === newLines[y]) {
        x++;
        y++;
      }
      
      v[k + max] = x;
      
      if (x >= n && y >= m) {
        found = true;
        break;
      }
    }
    
    if (found) break;
  }
  
  const operations = backtrack(trace, oldLines, newLines);
  
  return {
    operations,
    stats: {
      oldLines: n,
      newLines: m,
      insertions: operations.filter(o => o.type === OperationType.INSERT).length,
      deletions: operations.filter(o => o.type === OperationType.DELETE).length,
      equals: operations.filter(o => o.type === OperationType.EQUAL).length
    }
  };
}

function backtrack(trace, oldLines, newLines) {
  const operations = [];
  let x = oldLines.length;
  let y = newLines.length;
  const max = oldLines.length + newLines.length;
  
  for (let d = trace.length - 1; d >= 0; d--) {
    const v = trace[d];
    const k = x - y;
    
    let prevK;
    if (k === -d || (k !== d && (v[k - 1 + max] || 0) < (v[k + 1 + max] || 0))) {
      prevK = k + 1;
    } else {
      prevK = k - 1;
    }
    
    const prevX = v[prevK + max] || 0;
    const prevY = prevX - prevK;
    
    while (x > prevX && y > prevY) {
      operations.unshift({
        type: OperationType.EQUAL,
        oldLine: oldLines[x - 1],
        newLine: newLines[y - 1],
        oldIndex: x - 1,
        newIndex: y - 1
      });
      x--;
      y--;
    }
    
    if (d > 0) {
      if (prevK === k - 1) {
        operations.unshift({
          type: OperationType.DELETE,
          oldLine: oldLines[x - 1],
          newLine: null,
          oldIndex: x - 1,
          newIndex: null
        });
        x--;
      } else {
        operations.unshift({
          type: OperationType.INSERT,
          oldLine: null,
          newLine: newLines[y - 1],
          oldIndex: null,
          newIndex: y - 1
        });
        y--;
      }
    }
  }
  
  return mergeReplacements(operations);
}

function mergeReplacements(operations) {
  const result = [];
  let i = 0;
  
  while (i < operations.length) {
    if (i + 1 < operations.length && 
        operations[i].type === OperationType.DELETE && 
        operations[i + 1].type === OperationType.INSERT) {
      result.push({
        type: OperationType.REPLACE,
        oldLine: operations[i].oldLine,
        newLine: operations[i + 1].newLine,
        oldIndex: operations[i].oldIndex,
        newIndex: operations[i + 1].newIndex
      });
      i += 2;
    } else {
      result.push(operations[i]);
      i++;
    }
  }
  
  return result;
}

export function getSideBySideLines(operations) {
  const left = [];
  const right = [];
  
  let leftLineNum = 0;
  let rightLineNum = 0;
  
  for (const op of operations) {
    switch (op.type) {
      case OperationType.EQUAL:
        leftLineNum++;
        rightLineNum++;
        left.push({
          type: OperationType.EQUAL,
          content: op.oldLine,
          lineNumber: leftLineNum
        });
        right.push({
          type: OperationType.EQUAL,
          content: op.newLine,
          lineNumber: rightLineNum
        });
        break;
        
      case OperationType.DELETE:
        leftLineNum++;
        left.push({
          type: OperationType.DELETE,
          content: op.oldLine,
          lineNumber: leftLineNum
        });
        right.push({
          type: OperationType.DELETE,
          content: null,
          lineNumber: null
        });
        break;
        
      case OperationType.INSERT:
        rightLineNum++;
        left.push({
          type: OperationType.INSERT,
          content: null,
          lineNumber: null
        });
        right.push({
          type: OperationType.INSERT,
          content: op.newLine,
          lineNumber: rightLineNum
        });
        break;
        
      case OperationType.REPLACE:
        leftLineNum++;
        rightLineNum++;
        left.push({
          type: OperationType.REPLACE,
          content: op.oldLine,
          lineNumber: leftLineNum
        });
        right.push({
          type: OperationType.REPLACE,
          content: op.newLine,
          lineNumber: rightLineNum
        });
        break;
    }
  }
  
  return { left, right };
}
