const GRID_RESOLUTION = 38;

async function init() {
  const statusEl = document.getElementById('status');
  const container = document.getElementById('container');
  const windSpeedEl = document.getElementById('windSpeed');
  const windSpeedVal = document.getElementById('windSpeedVal');
  const viscosityEl = document.getElementById('viscosity');
  const viscosityVal = document.getElementById('viscosityVal');
  const particleCountEl = document.getElementById('particleCount');
  const particleCountVal = document.getElementById('particleCountVal');
  const resetBtn = document.getElementById('resetBtn');
  const pauseBtn = document.getElementById('pauseBtn');

  let paused = false;

  const renderer = new WindTunnelRenderer(container, {});

  statusEl.textContent = '获取建筑数据...';

  try {
    const response = await fetch('/api/building');
    const buildingData = await response.json();

    statusEl.textContent = '加载建筑模型...';
    const bounds = renderer.loadBuilding(buildingData);

    statusEl.textContent = '初始化流体解算器...';

    const fluidConfig = {
      nx: GRID_RESOLUTION,
      ny: Math.round(GRID_RESOLUTION * 260 / 220),
      nz: Math.round(GRID_RESOLUTION * 180 / 220),
      cellSize: 1.0,
      dt: 0.1,
      viscosity: parseFloat(viscosityEl.value),
      windDir: [1, 0, 0],
      windSpeed: parseFloat(windSpeedEl.value),
      bounds: bounds
    };

    const solver = new FluidSolver3D(fluidConfig);

    statusEl.textContent = '构建障碍物网格...';
    solver.setObstacle(buildingData.vertices, buildingData.faces);

    const particleConfig = {
      numParticles: parseInt(particleCountEl.value),
      maxTrailLength: 25
    };
    const windParticles = new WindParticles(solver, particleConfig);

    renderer.setSolver(solver, windParticles);

    statusEl.textContent = '启动仿真...';
    renderer.animate();

    statusEl.textContent = '仿真运行中 - 风洞测试沙盒';

    windSpeedEl.addEventListener('input', () => {
      const val = parseFloat(windSpeedEl.value);
      windSpeedVal.textContent = val.toFixed(1);
      solver.windSpeed = val;
    });

    viscosityEl.addEventListener('input', () => {
      const val = parseFloat(viscosityEl.value);
      viscosityVal.textContent = val.toExponential(1);
      solver.viscosity = val;
    });

    particleCountEl.addEventListener('change', () => {
      const val = parseInt(particleCountEl.value);
      particleCountVal.textContent = val;
      windParticles.numParticles = val;
      windParticles.positions = new Float32Array(val * 3);
      windParticles.trails = [];
      windParticles.alive = new Uint8Array(val);
      windParticles.init();
    });

    resetBtn.addEventListener('click', () => {
      solver.u.fill(0);
      solver.v.fill(0);
      solver.w.fill(0);
      solver.p.fill(0);
      windParticles.init();
      statusEl.textContent = '已重置仿真';
      setTimeout(() => {
        if (!paused) statusEl.textContent = '仿真运行中 - 风洞测试沙盒';
      }, 1500);
    });

    pauseBtn.addEventListener('click', () => {
      paused = !paused;
      if (paused) {
        renderer.stop();
        pauseBtn.textContent = '继续';
        statusEl.textContent = '仿真已暂停';
      } else {
        renderer.animate();
        pauseBtn.textContent = '暂停';
        statusEl.textContent = '仿真运行中 - 风洞测试沙盒';
      }
    });

  } catch (error) {
    console.error('初始化失败:', error);
    statusEl.textContent = '初始化失败: ' + error.message;
    statusEl.style.color = '#ff4444';
  }
}

window.addEventListener('DOMContentLoaded', init);
