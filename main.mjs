import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { icp, applyTransform } from './icp.js';

const app = document.getElementById('app');
const logEl = document.getElementById('log');
const loadingEl = document.getElementById('loading');
const btnStart = document.getElementById('btnStart');
const btnReset = document.getElementById('btnReset');

function log(msg, cls = '') {
  const line = document.createElement('div');
  if (cls) line.className = cls;
  const t = new Date().toLocaleTimeString();
  line.innerHTML = `<span class="t">[${t}]</span> ${msg}`;
  logEl.appendChild(line);
  logEl.scrollTop = logEl.scrollHeight;
}

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0d12);

const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.01, 100);
camera.position.set(2.6, 1.9, 3.4);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
app.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;

const ambient = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambient);
const dir = new THREE.DirectionalLight(0xffffff, 0.7);
dir.position.set(3, 4, 5);
scene.add(dir);

const grid = new THREE.GridHelper(6, 24, 0x334155, 0x1e293b);
grid.position.y = -1.5;
scene.add(grid);

const axes = new THREE.AxesHelper(0.6);
axes.position.set(-2.2, -1.5, -2.2);
scene.add(axes);

const COLOR_A = new THREE.Color(0x60a5fa);
const COLOR_B = new THREE.Color(0xf87171);
const COLOR_ALIGNED = new THREE.Color(0xfacc15);

let pointsA = null;
let pointsB = null;
let pointsBOriginal = null;
let cloudA = null;
let cloudB = null;
let animating = false;

function pointsToBuffer(pts, color) {
  const n = pts.length;
  const positions = new Float32Array(n * 3);
  const colors = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    positions[i*3]   = pts[i][0];
    positions[i*3+1] = pts[i][1];
    positions[i*3+2] = pts[i][2];
    colors[i*3]   = color.r;
    colors[i*3+1] = color.g;
    colors[i*3+2] = color.b;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const mat = new THREE.PointsMaterial({
    size: 0.018,
    vertexColors: true,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.92,
  });
  return new THREE.Points(geo, mat);
}

function setCloudBColor(color) {
  if (!cloudB) return;
  const attr = cloudB.geometry.getAttribute('color');
  for (let i = 0; i < attr.count; i++) {
    attr.setXYZ(i, color.r, color.g, color.b);
  }
  attr.needsUpdate = true;
}

function updateCloudBFromPoints(pts) {
  if (!cloudB) return;
  const attr = cloudB.geometry.getAttribute('position');
  for (let i = 0; i < pts.length; i++) {
    attr.setXYZ(i, pts[i][0], pts[i][1], pts[i][2]);
  }
  attr.needsUpdate = true;
}

function clearScene() {
  if (cloudA) { scene.remove(cloudA); cloudA.geometry.dispose(); cloudA.material.dispose(); cloudA = null; }
  if (cloudB) { scene.remove(cloudB); cloudB.geometry.dispose(); cloudB.material.dispose(); cloudB = null; }
}

function loadFragments(seed = 42) {
  return fetch(`/api/fragments?seed=${seed}`).then(r => r.json());
}

function setupSceneFromData(data) {
  clearScene();
  pointsA = data.fragmentA.map(p => p.slice());
  pointsB = data.fragmentB.map(p => p.slice());
  pointsBOriginal = data.fragmentB.map(p => p.slice());
  cloudA = pointsToBuffer(pointsA, COLOR_A);
  cloudB = pointsToBuffer(pointsB, COLOR_B);
  scene.add(cloudA);
  scene.add(cloudB);
  const box = new THREE.Box3().setFromPoints([
    ...pointsA.map(p => new THREE.Vector3(p[0], p[1], p[2])),
    ...pointsB.map(p => new THREE.Vector3(p[0], p[1], p[2])),
  ]);
  const center = box.getCenter(new THREE.Vector3());
  camera.position.copy(center).add(new THREE.Vector3(2.8, 2.0, 3.2));
  controls.target.copy(center);
  controls.update();
}

function matrixFromRt(R, t) {
  const m = new THREE.Matrix4();
  m.set(
    R[0][0], R[0][1], R[0][2], t[0],
    R[1][0], R[1][1], R[1][2], t[1],
    R[2][0], R[2][1], R[2][2], t[2],
    0, 0, 0, 1
  );
  return m;
}

function lerpMatrix(Ma, Mb, alpha) {
  const ea = new THREE.Euler().setFromRotationMatrix(Ma);
  const eb = new THREE.Euler().setFromRotationMatrix(Mb);
  const pa = new THREE.Vector3().setFromMatrixPosition(Ma);
  const pb = new THREE.Vector3().setFromMatrixPosition(Mb);
  const q = new THREE.Quaternion().setFromEuler(ea).slerp(new THREE.Quaternion().setFromEuler(eb), alpha);
  const p = pa.clone().lerp(pb, alpha);
  const m = new THREE.Matrix4();
  m.makeRotationFromQuaternion(q);
  m.setPosition(p);
  return m;
}

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

async function runICP() {
  if (animating) return;
  animating = true;
  btnStart.disabled = true;
  log('开始运行 ICP 算法（前端算力）…', 'info');

  const maxIter = parseInt(document.getElementById('maxIter').value, 10) || 40;
  const sampleSize = parseInt(document.getElementById('sample').value, 10) || 1500;
  const kSigma = parseFloat(document.getElementById('kSigma').value) || 2.0;

  const t0 = performance.now();
  const result = icp(pointsB, pointsA, { maxIter, sampleSize, kSigma });
  const total = performance.now() - t0;

  log(`ICP 完成：共 ${result.iterations.length} 次迭代，耗时 ${total.toFixed(1)} ms，最终 RMSE = ${result.finalRmse.toFixed(5)}`, 'ok');
  result.iterations.slice(0, 6).forEach(it => log(`  · 迭代 ${it.iter}：RMSE=${it.rmse.toFixed(5)}，内点数=${it.inliers}，耗时=${it.timeMs}ms`));
  if (result.iterations.length > 6) log(`  · …（省略 ${result.iterations.length - 6} 次迭代记录）`);

  const alignedB = applyTransform(pointsBOriginal, result.R, result.t);
  const M0 = new THREE.Matrix4().identity();
  const M1 = matrixFromRt(result.R, result.t);

  log('开始播放吸附动画（碎片 B 向碎片 A 靠拢）…', 'info');
  const duration = 2500;
  const start = performance.now();

  await new Promise((resolve) => {
    function animate() {
      const now = performance.now();
      const elapsed = now - start;
      const t = Math.min(1, elapsed / duration);
      const eased = easeInOutCubic(t);
      const M = lerpMatrix(M0, M1, eased);
      const transformed = pointsBOriginal.map(p => {
        const v = new THREE.Vector3(p[0], p[1], p[2]).applyMatrix4(M);
        return [v.x, v.y, v.z];
      });
      updateCloudBFromPoints(transformed);

      const mix = eased;
      const c = COLOR_B.clone().lerp(COLOR_ALIGNED, mix);
      setCloudBColor(c);

      if (t < 1) {
        requestAnimationFrame(animate);
      } else {
        updateCloudBFromPoints(alignedB);
        setCloudBColor(COLOR_ALIGNED);
        resolve();
      }
    }
    requestAnimationFrame(animate);
  });

  log('✅ 拼接完成！两件碎片已在三维空间中自动对齐。', 'ok');
  btnStart.disabled = false;
  animating = false;
}

function resetView() {
  if (!pointsBOriginal) return;
  pointsB = pointsBOriginal.map(p => p.slice());
  updateCloudBFromPoints(pointsB);
  setCloudBColor(COLOR_B);
  log('已重置场景，碎片 B 回到初始位置。', 'warn');
}

btnStart.addEventListener('click', () => {
  if (!pointsA) return;
  runICP();
});
btnReset.addEventListener('click', () => {
  resetView();
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

function renderLoop() {
  requestAnimationFrame(renderLoop);
  controls.update();
  renderer.render(scene, camera);
}
renderLoop();

async function boot() {
  log('正在从服务端 /api/fragments 请求点云数据…', 'info');
  try {
    const seed = Math.floor(Math.random() * 10000);
    const data = await loadFragments(seed);
    log(`收到点云：A=${data.meta.fragmentA_count} 点，B=${data.meta.fragmentB_count} 点（seed=${seed}）`, 'ok');
    setupSceneFromData(data);
    loadingEl.classList.add('hidden');
    log('三维场景已就绪。点击「开始拼接」按钮运行 ICP 并查看吸附动画。', 'info');
  } catch (e) {
    loadingEl.textContent = '请求失败：' + e.message;
    log('请求失败：' + e.message, 'warn');
  }
}

boot();
