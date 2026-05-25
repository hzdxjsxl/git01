const App = (() => {

  let employees = [];
  let currentGraph = null;
  let currentLayout = null;
  let canvas, ctx;

  async function loadEmployees() {
    try {
      const res = await fetch('/api/employees');
      const data = await res.json();
      employees = data.relationships;
      return employees;
    } catch (e) {
      console.error('加载员工数据失败:', e);
      return [];
    }
  }

  function initControls() {
    const applicantSelect = document.getElementById('applicant');
    const deptSelect = document.getElementById('dept');
    const amountInput = document.getElementById('amount');
    const generateBtn = document.getElementById('generate');
    const showGridToggle = document.getElementById('showGrid');

    const depts = [...new Set(employees.map(e => e.dept))];
    depts.forEach(dept => {
      const opt = document.createElement('option');
      opt.value = dept;
      opt.textContent = dept;
      deptSelect.appendChild(opt);
    });

    function updateApplicants(dept) {
      applicantSelect.innerHTML = '';
      const filtered = dept
        ? employees.filter(e => e.dept === dept)
        : employees;
      filtered.forEach(emp => {
        const opt = document.createElement('option');
        opt.value = emp.id;
        opt.textContent = `${emp.name} (${emp.title})`;
        applicantSelect.appendChild(opt);
      });
    }

    updateApplicants(null);

    deptSelect.addEventListener('change', (e) => {
      updateApplicants(e.target.value);
    });

    generateBtn.addEventListener('click', handleGenerate);

    document.getElementById('resetZoom').addEventListener('click', resetZoom);

    let zoomLevel = 1;
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      zoomLevel = Math.max(0.3, Math.min(2, zoomLevel + delta));
      applyZoom(zoomLevel);
    });

    let isDragging = false;
    let startX, startY, scrollLeft, scrollTop;
    canvas.addEventListener('mousedown', (e) => {
      isDragging = true;
      startX = e.pageX - canvas.offsetLeft;
      startY = e.pageY - canvas.offsetTop;
      const container = canvas.parentElement;
      scrollLeft = container.scrollLeft;
      scrollTop = container.scrollTop;
    });

    canvas.addEventListener('mouseup', () => isDragging = false);
    canvas.addEventListener('mouseleave', () => isDragging = false);
    canvas.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      e.preventDefault();
      const x = e.pageX - canvas.offsetLeft;
      const y = e.pageY - canvas.offsetTop;
      const walkX = (x - startX) * 1.5;
      const walkY = (y - startY) * 1.5;
      const container = canvas.parentElement;
      container.scrollLeft = scrollLeft - walkX;
      container.scrollTop = scrollTop - walkY;
    });

    return { showGrid: showGridToggle.checked };
  }

  function resetZoom() {
    canvas.style.transform = 'scale(1)';
    canvas.style.transformOrigin = 'top left';
  }

  function applyZoom(level) {
    canvas.style.transform = `scale(${level})`;
    canvas.style.transformOrigin = 'top left';
  }

  function handleGenerate() {
    const applicantId = document.getElementById('applicant').value;
    const dept = document.getElementById('dept').value;
    const amount = parseFloat(document.getElementById('amount').value) || 0;
    const showGrid = document.getElementById('showGrid').checked;

    if (!applicantId) {
      alert('请选择申请人');
      return;
    }

    try {
      currentGraph = ApprovalEngine.buildApprovalGraph(employees, applicantId, amount, dept);

      const canvasWidth = Math.max(900, currentGraph.getAllNodes().length * 200);
      canvas.width = canvasWidth;

      currentLayout = LayoutEngine.computeLayout(currentGraph, applicantId, {
        nodeWidth: 180,
        nodeHeight: 70,
        hSpacing: 40,
        vSpacing: 60,
        canvasWidth: canvasWidth,
        padding: 50
      });

      canvas.height = currentLayout.totalHeight;

      Renderer.render(ctx, currentGraph, currentLayout, {
        canvasWidth: canvas.width,
        canvasHeight: canvas.height,
        showGrid: showGrid
      });

      updateInfoPanel(applicantId, amount, dept);
    } catch (e) {
      console.error('生成审批流失败:', e);
      alert('生成审批流失败: ' + e.message);
    }
  }

  function updateInfoPanel(applicantId, amount, dept) {
    const applicant = employees.find(e => e.id === applicantId);
    const chain = ApprovalEngine.getApprovalChain(currentGraph);

    const infoHtml = `
      <div class="info-card">
        <div class="info-title">申请信息</div>
        <div class="info-row"><span class="info-label">申请人:</span> <span class="info-value">${applicant.name}</span></div>
        <div class="info-row"><span class="info-label">部门:</span> <span class="info-value">${dept || applicant.dept}</span></div>
        <div class="info-row"><span class="info-label">申请金额:</span> <span class="info-value amount">￥${amount.toLocaleString()}</span></div>
      </div>
      <div class="info-card">
        <div class="info-title">审批链 (${chain.length} 人)</div>
        ${chain.map((node, idx) => `
          <div class="chain-item ${idx === chain.length - 1 ? 'final' : ''}">
            <span class="chain-index">${idx + 1}</span>
            <span class="chain-name">${node.name}</span>
            <span class="chain-role">${node.title}</span>
            <span class="chain-badge ${node.nodeType}">${node.nodeType === 'applicant' ? '申请人' : node.nodeType === 'final_approver' ? '终审' : '审批'}</span>
          </div>
        `).join('')}
      </div>
    `;

    document.getElementById('infoPanel').innerHTML = infoHtml;
  }

  async function init() {
    canvas = document.getElementById('canvas');
    ctx = canvas.getContext('2d');

    await loadEmployees();
    const settings = initControls();

    canvas.width = 900;
    canvas.height = 400;
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#64748b';
    ctx.font = '18px "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('请在左侧配置申请人、部门和金额，点击"生成审批流"查看流程', canvas.width / 2, canvas.height / 2);

    console.log('审批流系统初始化完成');
    console.log('员工数据:', employees.length, '人');
  }

  return { init };
})();

document.addEventListener('DOMContentLoaded', App.init);
