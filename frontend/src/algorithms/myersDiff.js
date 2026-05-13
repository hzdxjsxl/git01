export const OperationType = {
  EQUAL: 'equal',
  DELETE: 'delete',
  INSERT: 'insert',
  REPLACE: 'replace'
};

function shortestEditDistance(oldLines, newLines, a, b, c, d, vf, vb) {
  const n = b - a;
  const m = d - c;
  const max = n + m;
  
  const kOffset = max;
  const delta = n - m;
  const even = (delta & 1) === 1;
  
  for (let i = 0; i < vf.length; i++) {
    vf[i] = -1;
    vb[i] = -1;
  }
  
  vf[kOffset + 1] = 0;
  vb[kOffset + delta - 1] = n;
  
  for (let D = 0; D <= max; D++) {
    for (let k = -D; k <= D; k += 2) {
      let x;
      const kIdx = k + kOffset;
      
      if (k === -D || (k !== D && vf[kIdx - 1] < vf[kIdx + 1])) {
        x = vf[kIdx + 1];
      } else {
        x = vf[kIdx - 1] + 1;
      }
      
      let y = x - k;
      
      while (x < n && y < m && oldLines[a + x] === newLines[c + y]) {
        x++;
        y++;
      }
      
      vf[kIdx] = x;
      
      if (even && k >= delta - (D - 1) && k <= delta + (D - 1) && vf[kIdx] >= vb[kIdx]) {
        return { D, x: x + a, y: y + c, k };
      }
    }
    
    for (let k = -D; k <= D; k += 2) {
      const k2 = k + delta;
      const kIdx = k2 + kOffset;
      
      let x;
      if (k === D || (k !== -D && vb[kIdx - 1] < vb[kIdx + 1])) {
        x = vb[kIdx - 1];
      } else {
        x = vb[kIdx + 1] - 1;
      }
      
      let y = x - k2;
      
      while (x > 0 && y > 0 && oldLines[a + x - 1] === newLines[c + y - 1]) {
        x--;
        y--;
      }
      
      vb[kIdx] = x;
      
      if (!even && k2 >= -D && k2 <= D && vb[kIdx] <= vf[k2 + kOffset]) {
        return { D: 2 * D + 1, x: x + a, y: y + c, k: k2 };
      }
    }
  }
  
  return { D: 0, x: a, y: c, k: 0 };
}

function lcs(oldLines, newLines, a, b, c, d, operations, vf, vb) {
  while (a < b && c < d && oldLines[a] === newLines[c]) {
    operations.push({
      type: OperationType.EQUAL,
      oldLine: oldLines[a],
      newLine: newLines[c],
      oldIndex: a,
      newIndex: c
    });
    a++;
    c++;
  }
  
  while (a < b && c < d && oldLines[b - 1] === newLines[d - 1]) {
    b--;
    d--;
  }
  
  if (a < b && c < d) {
    const middle = shortestEditDistance(oldLines, newLines, a, b, c, d, vf, vb);
    
    if (middle.D > 0) {
      lcs(oldLines, newLines, a, middle.x, c, middle.y, operations, vf, vb);
      lcs(oldLines, newLines, middle.x, b, middle.y, d, operations, vf, vb);
    }
  } else if (a < b) {
    for (let i = a; i < b; i++) {
      operations.push({
        type: OperationType.DELETE,
        oldLine: oldLines[i],
        newLine: null,
        oldIndex: i,
        newIndex: null
      });
    }
  } else if (c < d) {
    for (let i = c; i < d; i++) {
      operations.push({
        type: OperationType.INSERT,
        oldLine: null,
        newLine: newLines[i],
        oldIndex: null,
        newIndex: i
      });
    }
  }
}

export function computeDiff(oldText, newText) {
  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');
  
  const n = oldLines.length;
  const m = newLines.length;
  
  const max = Math.max(n, m) * 2;
  const vf = new Int32Array(2 * max + 1);
  const vb = new Int32Array(2 * max + 1);
  
  const operations = [];
  
  lcs(oldLines, newLines, 0, n, 0, m, operations, vf, vb);
  
  const merged = mergeReplacements(operations);
  
  return {
    operations: merged,
    stats: {
      oldLines: n,
      newLines: m,
      insertions: merged.filter(o => o.type === OperationType.INSERT).length,
      deletions: merged.filter(o => o.type === OperationType.DELETE).length,
      equals: merged.filter(o => o.type === OperationType.EQUAL).length
    }
  };
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
