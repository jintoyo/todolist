/**
 * Human Figure Drawing Interactive Visualizer & Studio
 * Complete 2D Canvas Construction Engine
 */

// ==========================================
// STATE MANAGEMENT
// ==========================================
const state = {
  currentAngle: 'front', // 'front', 'side', 'contrapposto', 'dynamic'
  headRatio: 8.0,
  isAnimating: false,
  animTime: 0,
  animFrameId: null,

  // Layers visibility & opacity
  layers: {
    grid: { visible: true, opacity: 0.9 },
    gesture: { visible: true, opacity: 0.8 },
    skeleton: { visible: true, opacity: 0.75 },
    mannequin: { visible: true, opacity: 0.85 },
    muscle: { visible: true, opacity: 0.7 },
    lineart: { visible: true, opacity: 1.0 }
  },

  // Practice studio state
  practice: {
    tool: 'pen', // 'pen' or 'eraser'
    color: '#ffffff',
    size: 3,
    bgTemplate: 'figure_proportions',
    bgOpacity: 0.35,
    isDrawing: false,
    lastX: 0,
    lastY: 0
  }
};

// ==========================================
// DOM ELEMENTS
// ==========================================
let figureCanvas, ctx;
let practiceBgCanvas, bgCtx;
let practiceDrawCanvas, drawCtx;

window.addEventListener('DOMContentLoaded', () => {
  figureCanvas = document.getElementById('figureCanvas');
  ctx = figureCanvas.getContext('2d');

  practiceBgCanvas = document.getElementById('practiceBgCanvas');
  bgCtx = practiceBgCanvas.getContext('2d');

  practiceDrawCanvas = document.getElementById('practiceDrawCanvas');
  drawCtx = practiceDrawCanvas.getContext('2d');

  initPracticeCanvasEvents();
  renderPracticeBackground();
  updateFigure();
  renderRulerOverlay();
});

// ==========================================
// TAB SWITCHING & MODALS
// ==========================================
function switchTab(tabId) {
  const tabs = ['interactive', 'theory', 'parts', 'practice'];
  tabs.forEach(t => {
    const el = document.getElementById(`tab-content-${t}`);
    const btn = document.getElementById(`tab-btn-${t}`);
    if (el) {
      if (t === tabId) {
        el.classList.remove('hidden');
      } else {
        el.classList.add('hidden');
      }
    }
    if (btn) {
      if (t === tabId) {
        btn.classList.add('active');
        btn.classList.remove('text-slate-400');
      } else {
        btn.classList.remove('active');
        btn.classList.add('text-slate-400');
      }
    }
  });

  // Re-trigger icons & resize
  if (window.lucide) lucide.createIcons();
  if (tabId === 'interactive') {
    updateFigure();
  } else if (tabId === 'practice') {
    renderPracticeBackground();
  }
}

function openImageModal(imgSrc) {
  const modal = document.getElementById('imageModal');
  const modalImg = document.getElementById('modalImg');
  modalImg.src = imgSrc;
  modal.classList.remove('hidden');
}

function closeImageModal() {
  document.getElementById('imageModal').classList.add('hidden');
}

// Close modal on Escape
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeImageModal();
});

// ==========================================
// INTERACTIVE FIGURE VIEWER ENGINE
// ==========================================
function setFigureAngle(angle) {
  state.currentAngle = angle;
  
  // Update buttons
  document.querySelectorAll('.angle-btn').forEach(btn => btn.classList.remove('active', 'bg-indigo-600', 'text-white'));
  const btnMap = {
    front: 'angle-front-btn',
    side: 'angle-side-btn',
    contrapposto: 'angle-contra-btn',
    dynamic: 'angle-dynamic-btn'
  };
  const activeBtn = document.getElementById(btnMap[angle]);
  if (activeBtn) activeBtn.classList.add('active', 'bg-indigo-600', 'text-white');

  const names = {
    front: '정면 기본 비율 (Front View)',
    side: '측면 실루엣 & S커브 (Side View)',
    contrapposto: '콘트라포스토 동세 (Contrapposto)',
    dynamic: '동적 액션 포즈 (Dynamic Action)'
  };
  document.getElementById('current-pose-name').textContent = names[angle];
  
  updateFigure();
  renderRulerOverlay();
}

function changeHeadRatio(val) {
  state.headRatio = parseFloat(val);
  const labels = {
    '6': '6.0 등신 (SD / 캐주얼 웹툰)',
    '6.5': '6.5 등신 (캐주얼 애니메이션)',
    '7': '7.0 등신 (동양인 평균 체형)',
    '7.5': '7.5 등신 (서구 실사 체형)',
    '8': '8.0 등신 (황금비율 / 패션 / 히어로)',
    '8.5': '8.5 등신 (극화체 / 하이패션)'
  };
  document.getElementById('headRatioLabel').textContent = labels[val] || `${val} 등신`;
  document.getElementById('canvasStatusText').textContent = `${val}등신 비율 모드`;
  renderRulerOverlay();
  updateFigure();
}

function renderRulerOverlay() {
  const ruler = document.getElementById('headsRuler');
  if (!ruler) return;
  const count = Math.round(state.headRatio);
  const labels = [
    'H1: 정수리-턱',
    'H2: 가슴선/쇄골',
    'H3: 허리/배꼽',
    'H4: 사타구니 1/2',
    'H5: 허벅지 중간',
    'H6: 무릎 관절',
    'H7: 종아리 하단',
    'H8: 발바닥 접지'
  ];

  let html = '';
  for (let i = 1; i <= count; i++) {
    const label = labels[i - 1] || `H${i}`;
    html += `<div class="flex items-center gap-1">
      <span class="text-indigo-400 font-bold">${i}H</span>
      <span class="text-[9px] text-slate-500 hidden sm:inline">(${label.split(':')[1] || ''})</span>
    </div>`;
  }
  ruler.innerHTML = html;
}

function applyPreset(preset) {
  const defaults = {
    beginner: { grid: 1.0, gesture: 0.9, skeleton: 0.85, mannequin: 0, muscle: 0, lineart: 0.3 },
    '3d': { grid: 0.4, gesture: 0.5, skeleton: 0.5, mannequin: 0.95, muscle: 0.3, lineart: 0.5 },
    muscle: { grid: 0.2, gesture: 0.3, skeleton: 0.2, mannequin: 0.4, muscle: 0.9, lineart: 1.0 },
    all: { grid: 0.8, gesture: 0.8, skeleton: 0.8, mannequin: 0.85, muscle: 0.75, lineart: 1.0 }
  };

  const p = defaults[preset];
  if (!p) return;

  ['grid', 'gesture', 'skeleton', 'mannequin', 'muscle', 'lineart'].forEach(layer => {
    const chk = document.getElementById(`layer-${layer}`);
    const slider = document.getElementById(`opacity-${layer}`);
    const val = p[layer];
    if (chk && slider) {
      chk.checked = val > 0;
      slider.value = val > 0 ? val : 0.5;
    }
  });

  updateFigure();
}

function resetLayers() {
  applyPreset('all');
}

function updateFigure() {
  if (!ctx) return;

  // Read UI
  ['grid', 'gesture', 'skeleton', 'mannequin', 'muscle', 'lineart'].forEach(layer => {
    const chk = document.getElementById(`layer-${layer}`);
    const slider = document.getElementById(`opacity-${layer}`);
    if (chk && slider) {
      state.layers[layer].visible = chk.checked;
      state.layers[layer].opacity = parseFloat(slider.value);
    }
  });

  // Clear Canvas
  const w = figureCanvas.width;
  const h = figureCanvas.height;
  ctx.clearRect(0, 0, w, h);

  // Background Subtle Grid
  drawBackgroundBlueprint(ctx, w, h);

  // Breathing offset if animating
  const breath = state.isAnimating ? Math.sin(state.animTime * 0.05) * 4 : 0;
  const sway = state.isAnimating ? Math.cos(state.animTime * 0.03) * 2 : 0;

  // Draw Figure Layers according to Angle
  const totalHeads = state.headRatio;
  const topMargin = 38 + breath * 0.3;
  const bottomMargin = h - 45;
  const totalHeight = bottomMargin - topMargin;
  const headUnit = totalHeight / totalHeads;
  const centerX = w / 2 + sway;

  // 1. Grid Layer
  if (state.layers.grid.visible) {
    ctx.save();
    ctx.globalAlpha = state.layers.grid.opacity;
    drawHeadGrid(ctx, w, h, topMargin, headUnit, totalHeads, centerX);
    ctx.restore();
  }

  // 2. Gesture Line Layer
  if (state.layers.gesture.visible) {
    ctx.save();
    ctx.globalAlpha = state.layers.gesture.opacity;
    drawGestureLayer(ctx, state.currentAngle, topMargin, headUnit, centerX, breath);
    ctx.restore();
  }

  // 3. Skeleton / Joint Layer
  if (state.layers.skeleton.visible) {
    ctx.save();
    ctx.globalAlpha = state.layers.skeleton.opacity;
    drawSkeletonLayer(ctx, state.currentAngle, topMargin, headUnit, centerX, breath);
    ctx.restore();
  }

  // 4. 3D Geometric Mannequin Layer
  if (state.layers.mannequin.visible) {
    ctx.save();
    ctx.globalAlpha = state.layers.mannequin.opacity;
    drawMannequinLayer(ctx, state.currentAngle, topMargin, headUnit, centerX, breath);
    ctx.restore();
  }

  // 5. Muscles & Anatomy Layer
  if (state.layers.muscle.visible) {
    ctx.save();
    ctx.globalAlpha = state.layers.muscle.opacity;
    drawMuscleLayer(ctx, state.currentAngle, topMargin, headUnit, centerX, breath);
    ctx.restore();
  }

  // 6. Finished Line Art Layer
  if (state.layers.lineart.visible) {
    ctx.save();
    ctx.globalAlpha = state.layers.lineart.opacity;
    drawLineArtLayer(ctx, state.currentAngle, topMargin, headUnit, centerX, breath);
    ctx.restore();
  }
}

// -------------------------------------------------------------
// BLUEPRINT BACKGROUND
// -------------------------------------------------------------
function drawBackgroundBlueprint(c, w, h) {
  c.fillStyle = '#060913';
  c.fillRect(0, 0, w, h);

  // Subtle grid squares
  c.strokeStyle = 'rgba(30, 41, 59, 0.4)';
  c.lineWidth = 1;
  const step = 20;
  c.beginPath();
  for (let x = 0; x < w; x += step) {
    c.moveTo(x, 0);
    c.lineTo(x, h);
  }
  for (let y = 0; y < h; y += step) {
    c.moveTo(0, y);
    c.lineTo(w, y);
  }
  c.stroke();
}

// -------------------------------------------------------------
// 1. HEAD GRID LAYER
// -------------------------------------------------------------
function drawHeadGrid(c, w, h, top, headH, count, cx) {
  c.lineWidth = 1;

  for (let i = 0; i <= count; i++) {
    const y = top + i * headH;
    c.strokeStyle = (i === 0 || i === 4 || i === count) ? 'rgba(56, 189, 248, 0.7)' : 'rgba(56, 189, 248, 0.25)';
    c.setLineDash([4, 4]);
    c.beginPath();
    c.moveTo(40, y);
    c.lineTo(w - 40, y);
    c.stroke();
    c.setLineDash([]);

    // Head Index Tag
    if (i < count) {
      c.fillStyle = 'rgba(56, 189, 248, 0.9)';
      c.font = 'bold 10px monospace';
      c.fillText(`H${i + 1}`, 18, y + headH / 2 + 4);
    }
  }

  // 1/2 Center Dividing Line (Crotch level)
  const midY = top + 4 * headH;
  c.strokeStyle = 'rgba(239, 68, 68, 0.6)';
  c.lineWidth = 1.5;
  c.setLineDash([6, 3]);
  c.beginPath();
  c.moveTo(25, midY);
  c.lineTo(w - 25, midY);
  c.stroke();
  c.setLineDash([]);

  c.fillStyle = '#ef4444';
  c.font = 'bold 10px sans-serif';
  c.fillText('◀ 1/2 신체 중심 (사타구니)', w - 165, midY - 4);
}

// -------------------------------------------------------------
// 2. GESTURE & ACTION LINE LAYER
// -------------------------------------------------------------
function drawGestureLayer(c, angle, top, hH, cx, breath) {
  c.strokeStyle = '#f59e0b';
  c.lineWidth = 3;
  c.lineCap = 'round';
  c.lineJoin = 'round';

  c.beginPath();
  if (angle === 'front') {
    // Vertical Center Line of Gravity
    c.moveTo(cx, top);
    c.lineTo(cx, top + 8 * hH);
    c.stroke();

    // Horizontal Balance lines
    c.lineWidth = 2;
    // Shoulders (1.4 H)
    c.moveTo(cx - hH * 0.9, top + 1.4 * hH);
    c.lineTo(cx + hH * 0.9, top + 1.4 * hH);
    // Pelvis (4 H)
    c.moveTo(cx - hH * 0.7, top + 3.8 * hH);
    c.lineTo(cx + hH * 0.7, top + 3.8 * hH);
    c.stroke();

  } else if (angle === 'side') {
    // Spine S-Curve
    c.beginPath();
    c.moveTo(cx - 5, top + 0.5 * hH); // Head center
    c.bezierCurveTo(
      cx + 18, top + 1.8 * hH, // Thoracic spine backward curve
      cx - 15, top + 3.2 * hH, // Lumbar lordosis forward curve
      cx + 5, top + 4.0 * hH   // Sacrum
    );
    // Down leg
    c.bezierCurveTo(
      cx + 8, top + 5.5 * hH,
      cx - 6, top + 6.8 * hH,
      cx, top + 8.0 * hH
    );
    c.stroke();

  } else if (angle === 'contrapposto') {
    // Dynamic Contrapposto S-Curve
    c.beginPath();
    c.moveTo(cx, top + 0.3 * hH);
    c.bezierCurveTo(
      cx - 20, top + 1.8 * hH,
      cx + 25, top + 3.5 * hH,
      cx + 10, top + 4.0 * hH
    );
    c.lineTo(cx + 15, top + 8.0 * hH); // Weight bearing leg
    c.stroke();

    // Opposing tilt lines
    c.lineWidth = 2.5;
    // Shoulder tilted (left up, right down)
    c.beginPath();
    c.moveTo(cx - hH * 0.9, top + 1.25 * hH);
    c.lineTo(cx + hH * 0.9, top + 1.55 * hH);
    c.stroke();

    // Pelvis tilted (left down, right up)
    c.beginPath();
    c.moveTo(cx - hH * 0.75, top + 3.95 * hH);
    c.lineTo(cx + hH * 0.75, top + 3.65 * hH);
    c.stroke();

  } else if (angle === 'dynamic') {
    // Dynamic jump / dash curve
    c.beginPath();
    c.moveTo(cx - 40, top + 0.5 * hH);
    c.bezierCurveTo(
      cx + 10, top + 2.0 * hH,
      cx - 20, top + 4.0 * hH,
      cx + 40, top + 7.8 * hH
    );
    c.stroke();
  }
}

// -------------------------------------------------------------
// 3. SKELETON / JOINTS LAYER
// -------------------------------------------------------------
function drawSkeletonLayer(c, angle, top, hH, cx, breath) {
  c.strokeStyle = '#34d399';
  c.fillStyle = '#10b981';
  c.lineWidth = 2;

  function drawJoint(x, y, r = 4) {
    c.beginPath();
    c.arc(x, y, r, 0, Math.PI * 2);
    c.fill();
    c.stroke();
  }

  const headY = top + 0.5 * hH;
  const neckY = top + 1.0 * hH;
  const chestY = top + 2.0 * hH;
  const waistY = top + 3.0 * hH;
  const hipY = top + 3.8 * hH;
  const crotchY = top + 4.0 * hH;
  const kneeY = top + 5.9 * hH;
  const ankleY = top + 7.7 * hH;

  if (angle === 'front' || angle === 'side') {
    // Head circle & cross
    drawJoint(cx, headY, hH * 0.38);

    // Spine
    c.beginPath();
    c.moveTo(cx, neckY);
    c.lineTo(cx, hipY);
    c.stroke();

    const shoulderW = hH * 0.85;
    const hipW = hH * 0.6;

    // Shoulders
    drawJoint(cx - shoulderW, neckY + 12);
    drawJoint(cx + shoulderW, neckY + 12);
    c.beginPath();
    c.moveTo(cx - shoulderW, neckY + 12);
    c.lineTo(cx + shoulderW, neckY + 12);
    c.stroke();

    // Arms
    const elbowY = waistY + 5;
    const wristY = crotchY + 5;
    // Left Arm
    c.beginPath();
    c.moveTo(cx - shoulderW, neckY + 12);
    c.lineTo(cx - shoulderW - 10, elbowY);
    c.lineTo(cx - shoulderW - 15, wristY);
    c.stroke();
    drawJoint(cx - shoulderW - 10, elbowY, 3.5);
    drawJoint(cx - shoulderW - 15, wristY, 3.5);

    // Right Arm
    c.beginPath();
    c.moveTo(cx + shoulderW, neckY + 12);
    c.lineTo(cx + shoulderW + 10, elbowY);
    c.lineTo(cx + shoulderW + 15, wristY);
    c.stroke();
    drawJoint(cx + shoulderW + 10, elbowY, 3.5);
    drawJoint(cx + shoulderW + 15, wristY, 3.5);

    // Pelvis & Hips
    drawJoint(cx - hipW, hipY);
    drawJoint(cx + hipW, hipY);
    c.beginPath();
    c.moveTo(cx - hipW, hipY);
    c.lineTo(cx + hipW, hipY);
    c.stroke();

    // Legs
    // Left Leg
    c.beginPath();
    c.moveTo(cx - hipW, hipY);
    c.lineTo(cx - hipW + 5, kneeY);
    c.lineTo(cx - hipW + 2, ankleY);
    c.stroke();
    drawJoint(cx - hipW + 5, kneeY, 4);
    drawJoint(cx - hipW + 2, ankleY, 3.5);

    // Right Leg
    c.beginPath();
    c.moveTo(cx + hipW, hipY);
    c.lineTo(cx + hipW - 5, kneeY);
    c.lineTo(cx + hipW - 2, ankleY);
    c.stroke();
    drawJoint(cx + hipW - 5, kneeY, 4);
    drawJoint(cx + hipW - 2, ankleY, 3.5);

  } else if (angle === 'contrapposto') {
    // Contrapposto skeleton
    drawJoint(cx + 4, headY, hH * 0.38);

    const sL = { x: cx - hH * 0.85, y: top + 1.25 * hH };
    const sR = { x: cx + hH * 0.85, y: top + 1.55 * hH };
    drawJoint(sL.x, sL.y);
    drawJoint(sR.x, sR.y);
    c.beginPath();
    c.moveTo(sL.x, sL.y);
    c.lineTo(sR.x, sR.y);
    c.stroke();

    const hL = { x: cx - hH * 0.65, y: top + 3.95 * hH };
    const hR = { x: cx + hH * 0.65, y: top + 3.65 * hH };
    drawJoint(hL.x, hL.y);
    drawJoint(hR.x, hR.y);
    c.beginPath();
    c.moveTo(hL.x, hL.y);
    c.lineTo(hR.x, hR.y);
    c.stroke();

    // Spine
    c.beginPath();
    c.moveTo(cx, top + hH);
    c.bezierCurveTo(cx - 15, top + 2 * hH, cx + 15, top + 3.2 * hH, (hL.x + hR.x) / 2, (hL.y + hR.y) / 2);
    c.stroke();

    // Weight bearing leg (Right)
    c.beginPath();
    c.moveTo(hR.x, hR.y);
    c.lineTo(cx + 20, kneeY - 5);
    c.lineTo(cx + 15, ankleY);
    c.stroke();
    drawJoint(cx + 20, kneeY - 5, 4);
    drawJoint(cx + 15, ankleY, 3.5);

    // Relaxed leg (Left)
    c.beginPath();
    c.moveTo(hL.x, hL.y);
    c.lineTo(cx - 35, kneeY + 10);
    c.lineTo(cx - 40, ankleY);
    c.stroke();
    drawJoint(cx - 35, kneeY + 10, 4);
    drawJoint(cx - 40, ankleY, 3.5);

    // Left Arm on Hip
    c.beginPath();
    c.moveTo(sL.x, sL.y);
    c.lineTo(cx - hH * 1.15, waistY + 15);
    c.lineTo(hL.x, hL.y - 10);
    c.stroke();
    drawJoint(cx - hH * 1.15, waistY + 15, 3.5);

    // Right Arm Hanging
    c.beginPath();
    c.moveTo(sR.x, sR.y);
    c.lineTo(sR.x + 8, waistY + 20);
    c.lineTo(sR.x + 12, crotchY + 20);
    c.stroke();
    drawJoint(sR.x + 8, waistY + 20, 3.5);
  } else {
    // Dynamic running skeleton
    drawJoint(cx - 15, headY + 10, hH * 0.38);
    // Spine
    c.beginPath();
    c.moveTo(cx - 15, top + 0.9 * hH);
    c.lineTo(cx + 10, top + 3.5 * hH);
    c.stroke();
    // Pelvis
    drawJoint(cx - 15, top + 3.6 * hH);
    drawJoint(cx + 25, top + 3.4 * hH);
    // Lead Leg
    c.beginPath();
    c.moveTo(cx + 25, top + 3.4 * hH);
    c.lineTo(cx + 50, top + 4.8 * hH);
    c.lineTo(cx + 30, top + 6.8 * hH);
    c.stroke();
    drawJoint(cx + 50, top + 4.8 * hH, 4);
    drawJoint(cx + 30, top + 6.8 * hH, 3.5);
  }
}

// -------------------------------------------------------------
// 4. 3D GEOMETRIC MANNEQUIN BLOCKS LAYER
// -------------------------------------------------------------
function drawMannequinLayer(c, angle, top, hH, cx, breath) {
  c.fillStyle = 'rgba(99, 102, 241, 0.25)';
  c.strokeStyle = '#818cf8';
  c.lineWidth = 1.8;

  function drawCylinder(x1, y1, x2, y2, r1, r2) {
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const p1x = x1 + Math.cos(angle + Math.PI / 2) * r1;
    const p1y = y1 + Math.sin(angle + Math.PI / 2) * r1;
    const p2x = x1 + Math.cos(angle - Math.PI / 2) * r1;
    const p2y = y1 + Math.sin(angle - Math.PI / 2) * r1;
    const p3x = x2 + Math.cos(angle - Math.PI / 2) * r2;
    const p3y = y2 + Math.sin(angle - Math.PI / 2) * r2;
    const p4x = x2 + Math.cos(angle + Math.PI / 2) * r2;
    const p4y = y2 + Math.sin(angle + Math.PI / 2) * r2;

    c.beginPath();
    c.moveTo(p1x, p1y);
    c.lineTo(p2x, p2y);
    c.lineTo(p3x, p3y);
    c.lineTo(p4x, p4y);
    c.closePath();
    c.fill();
    c.stroke();

    // Cross-section contour rings for 3D feel
    c.beginPath();
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;
    const midR = (r1 + r2) / 2;
    c.ellipse(midX, midY, midR, midR * 0.35, angle + Math.PI / 2, 0, Math.PI * 2);
    c.stroke();
  }

  function drawBox(cx, cy, w, h, depth) {
    c.beginPath();
    c.rect(cx - w / 2, cy - h / 2, w, h);
    c.fill();
    c.stroke();
  }

  const headY = top + 0.5 * hH;
  const neckY = top + 0.95 * hH;
  const chestTop = top + 1.2 * hH;
  const chestH = 1.6 * hH;
  const pelvisTop = top + 3.2 * hH;
  const pelvisH = 0.8 * hH;
  const crotchY = top + 4.0 * hH;
  const kneeY = top + 5.9 * hH;
  const ankleY = top + 7.7 * hH;

  if (angle === 'front') {
    // 1. Head Cranium & Jaw Block
    c.beginPath();
    c.ellipse(cx, headY - 3, hH * 0.32, hH * 0.38, 0, 0, Math.PI * 2);
    c.fill();
    c.stroke();
    // Jaw Wedge
    c.beginPath();
    c.moveTo(cx - hH * 0.25, headY + 5);
    c.lineTo(cx - hH * 0.15, top + hH);
    c.lineTo(cx + hH * 0.15, top + hH);
    c.lineTo(cx + hH * 0.25, headY + 5);
    c.closePath();
    c.fill();
    c.stroke();

    // 2. Neck Cylinder
    drawCylinder(cx, top + 0.85 * hH, cx, top + 1.2 * hH, 12, 16);

    // 3. Thorax / Ribcage Egg-Box
    c.beginPath();
    c.roundRect(cx - hH * 0.65, chestTop, hH * 1.3, chestH, [16, 16, 24, 24]);
    c.fill();
    c.stroke();
    // Sternum line
    c.beginPath();
    c.moveTo(cx, chestTop);
    c.lineTo(cx, chestTop + chestH);
    // Inverted V arch at bottom
    c.moveTo(cx - 25, chestTop + chestH);
    c.lineTo(cx, chestTop + chestH - 22);
    c.lineTo(cx + 25, chestTop + chestH);
    c.stroke();

    // 4. Waist Connecting Volume
    c.beginPath();
    c.ellipse(cx, top + 3.0 * hH, hH * 0.45, 14, 0, 0, Math.PI * 2);
    c.stroke();

    // 5. Pelvis Bowl / Box
    c.beginPath();
    c.moveTo(cx - hH * 0.6, pelvisTop);
    c.lineTo(cx + hH * 0.6, pelvisTop);
    c.lineTo(cx + hH * 0.45, crotchY);
    c.lineTo(cx - hH * 0.45, crotchY);
    c.closePath();
    c.fill();
    c.stroke();

    // 6. Arms (Deltoid spheres + Cylinders)
    const sW = hH * 0.78;
    // Left Deltoid
    c.beginPath();
    c.arc(cx - sW - 8, chestTop + 8, 14, 0, Math.PI * 2);
    c.fill();
    c.stroke();
    // Right Deltoid
    c.beginPath();
    c.arc(cx + sW + 8, chestTop + 8, 14, 0, Math.PI * 2);
    c.fill();
    c.stroke();

    // Upper Arms
    drawCylinder(cx - sW - 8, chestTop + 14, cx - sW - 14, top + 3.0 * hH, 12, 10);
    drawCylinder(cx + sW + 8, chestTop + 14, cx + sW + 14, top + 3.0 * hH, 12, 10);

    // Forearms
    drawCylinder(cx - sW - 14, top + 3.0 * hH, cx - sW - 18, crotchY + 5, 10, 8);
    drawCylinder(cx + sW + 14, top + 3.0 * hH, cx + sW + 18, crotchY + 5, 10, 8);

    // Hand Wedges
    drawBox(cx - sW - 20, crotchY + 22, 16, 26, 0);
    drawBox(cx + sW + 20, crotchY + 22, 16, 26, 0);

    // 7. Legs (Thigh Cylinders + Calf Cylinders)
    const hipOffset = hH * 0.32;
    // Left Thigh
    drawCylinder(cx - hipOffset, crotchY - 5, cx - hipOffset + 4, kneeY, 19, 13);
    // Right Thigh
    drawCylinder(cx + hipOffset, crotchY - 5, cx + hipOffset - 4, kneeY, 19, 13);

    // Knee Caps
    c.beginPath();
    c.arc(cx - hipOffset + 4, kneeY + 5, 10, 0, Math.PI * 2);
    c.arc(cx + hipOffset - 4, kneeY + 5, 10, 0, Math.PI * 2);
    c.fill();
    c.stroke();

    // Calves
    drawCylinder(cx - hipOffset + 4, kneeY + 12, cx - hipOffset + 2, ankleY, 15, 9);
    drawCylinder(cx + hipOffset - 4, kneeY + 12, cx + hipOffset - 2, ankleY, 15, 9);

    // Feet Wedges
    drawBox(cx - hipOffset + 2, ankleY + 12, 18, 20, 0);
    drawBox(cx + hipOffset - 2, ankleY + 12, 18, 20, 0);

  } else if (angle === 'side') {
    // Side View 3D Blocks with Forward/Backward Tilts
    // Cranium + Jaw profile
    c.beginPath();
    c.ellipse(cx, headY - 3, hH * 0.36, hH * 0.36, 0, 0, Math.PI * 2);
    c.fill();
    c.stroke();
    // Nose wedge
    c.beginPath();
    c.moveTo(cx - hH * 0.35, headY + 5);
    c.lineTo(cx - hH * 0.44, headY + 10);
    c.lineTo(cx - hH * 0.35, headY + 16);
    c.lineTo(cx - hH * 0.25, top + hH);
    c.lineTo(cx, top + hH);
    c.stroke();

    // Neck tilted forward
    drawCylinder(cx + 8, top + 0.85 * hH, cx - 2, top + 1.25 * hH, 13, 16);

    // Thorax tilted BACKWARD
    c.save();
    c.translate(cx + 5, chestTop + chestH / 2);
    c.rotate(-0.08);
    c.beginPath();
    c.roundRect(-hH * 0.48, -chestH / 2, hH * 0.96, chestH, 18);
    c.fill();
    c.stroke();
    c.restore();

    // Pelvis tilted FORWARD
    c.save();
    c.translate(cx - 2, pelvisTop + pelvisH / 2);
    c.rotate(0.12);
    c.beginPath();
    c.roundRect(-hH * 0.46, -pelvisH / 2, hH * 0.92, pelvisH, 14);
    c.fill();
    c.stroke();
    c.restore();

    // Leg Profile (Thigh curve forward, calf curve back)
    drawCylinder(cx - 2, crotchY - 5, cx + 5, kneeY, 21, 14);
    drawCylinder(cx + 5, kneeY + 10, cx - 8, ankleY, 17, 10);

    // Foot Wedge side profile
    c.beginPath();
    c.moveTo(cx + 12, ankleY + 8);
    c.lineTo(cx - 28, ankleY + 18);
    c.lineTo(cx + 16, ankleY + 18);
    c.closePath();
    c.fill();
    c.stroke();

  } else if (angle === 'contrapposto') {
    // Contrapposto 3D Blocks with Opposing Rotation
    c.beginPath();
    c.ellipse(cx + 5, headY, hH * 0.32, hH * 0.38, 0.05, 0, Math.PI * 2);
    c.fill();
    c.stroke();

    // Tilted Thorax (high left)
    c.save();
    c.translate(cx, top + 2.0 * hH);
    c.rotate(-0.1);
    c.beginPath();
    c.roundRect(-hH * 0.6, -hH * 0.75, hH * 1.2, hH * 1.5, 18);
    c.fill();
    c.stroke();
    c.restore();

    // Tilted Pelvis (high right)
    c.save();
    c.translate(cx + 8, top + 3.6 * hH);
    c.rotate(0.12);
    c.beginPath();
    c.roundRect(-hH * 0.55, -hH * 0.35, hH * 1.1, hH * 0.75, 14);
    c.fill();
    c.stroke();
    c.restore();

    // Weight leg (Right)
    drawCylinder(cx + 20, crotchY - 8, cx + 22, kneeY - 5, 20, 14);
    drawCylinder(cx + 22, kneeY + 5, cx + 16, ankleY, 16, 10);
    drawBox(cx + 16, ankleY + 12, 18, 20, 0);

    // Free leg (Left - bent)
    drawCylinder(cx - 15, crotchY, cx - 35, kneeY + 10, 18, 13);
    drawCylinder(cx - 35, kneeY + 18, cx - 40, ankleY, 15, 9);
    drawBox(cx - 40, ankleY + 12, 18, 20, 0);
  } else {
    // Dynamic Pose 3D Blocks
    c.beginPath();
    c.ellipse(cx - 15, headY + 10, hH * 0.32, hH * 0.38, -0.2, 0, Math.PI * 2);
    c.fill();
    c.stroke();

    c.save();
    c.translate(cx, top + 2.2 * hH);
    c.rotate(0.25);
    c.beginPath();
    c.roundRect(-hH * 0.55, -hH * 0.7, hH * 1.1, hH * 1.4, 16);
    c.fill();
    c.stroke();
    c.restore();
  }
}

// -------------------------------------------------------------
// 5. SIMPLIFIED MUSCLE & ANATOMY LAYER
// -------------------------------------------------------------
function drawMuscleLayer(c, angle, top, hH, cx, breath) {
  c.strokeStyle = '#fb7185';
  c.fillStyle = 'rgba(244, 63, 94, 0.15)';
  c.lineWidth = 1.5;

  const headY = top + 0.5 * hH;
  const chestTop = top + 1.2 * hH;
  const crotchY = top + 4.0 * hH;
  const kneeY = top + 5.9 * hH;
  const ankleY = top + 7.7 * hH;

  if (angle === 'front') {
    // 1. Clavicle (쇄골 - Bike Handle shape)
    c.beginPath();
    c.moveTo(cx - hH * 0.65, chestTop + 8);
    c.quadraticCurveTo(cx - hH * 0.3, chestTop + 14, cx, chestTop + 10);
    c.quadraticCurveTo(cx + hH * 0.3, chestTop + 14, cx + hH * 0.65, chestTop + 8);
    c.stroke();

    // 2. Trapezius (승모근)
    c.beginPath();
    c.moveTo(cx - 14, top + 0.85 * hH);
    c.lineTo(cx - hH * 0.6, chestTop + 6);
    c.moveTo(cx + 14, top + 0.85 * hH);
    c.lineTo(cx + hH * 0.6, chestTop + 6);
    c.stroke();

    // 3. Pectorals (대흉근)
    const pecY = top + 2.0 * hH;
    // Left pec
    c.beginPath();
    c.moveTo(cx, chestTop + 12);
    c.lineTo(cx - hH * 0.55, chestTop + 14);
    c.quadraticCurveTo(cx - hH * 0.55, pecY, cx - hH * 0.25, pecY);
    c.quadraticCurveTo(cx, pecY, cx, chestTop + 12);
    c.fill();
    c.stroke();
    // Right pec
    c.beginPath();
    c.moveTo(cx, chestTop + 12);
    c.lineTo(cx + hH * 0.55, chestTop + 14);
    c.quadraticCurveTo(cx + hH * 0.55, pecY, cx + hH * 0.25, pecY);
    c.quadraticCurveTo(cx, pecY, cx, chestTop + 12);
    c.fill();
    c.stroke();

    // 4. Deltoids (삼각근)
    c.beginPath();
    c.ellipse(cx - hH * 0.72, chestTop + 18, 14, 22, -0.15, 0, Math.PI * 2);
    c.ellipse(cx + hH * 0.72, chestTop + 18, 14, 22, 0.15, 0, Math.PI * 2);
    c.stroke();

    // 5. Abdominals (복근 6팩)
    const abTop = pecY + 4;
    const navelY = top + 3.0 * hH;
    // Linea alba (백선)
    c.beginPath();
    c.moveTo(cx, abTop);
    c.lineTo(cx, crotchY - 10);
    c.stroke();
    // Six pack dividers
    c.beginPath();
    c.moveTo(cx - 18, abTop + 16);
    c.lineTo(cx + 18, abTop + 16);
    c.moveTo(cx - 16, abTop + 32);
    c.lineTo(cx + 16, abTop + 32);
    c.moveTo(cx - 14, navelY);
    c.lineTo(cx + 14, navelY);
    c.stroke();

    // 6. Quadriceps (대퇴사두근)
    const hipOffset = hH * 0.32;
    // Left Quad teardrop (Vastus Medialis)
    c.beginPath();
    c.ellipse(cx - hipOffset + 6, kneeY - 18, 10, 18, -0.1, 0, Math.PI * 2);
    c.stroke();
    // Right Quad teardrop
    c.beginPath();
    c.ellipse(cx + hipOffset - 6, kneeY - 18, 10, 18, 0.1, 0, Math.PI * 2);
    c.stroke();

    // 7. Gastrocnemius (종아리 알 비복근 - High outer, low inner)
    c.beginPath();
    c.ellipse(cx - hipOffset - 2, kneeY + 30, 11, 24, 0.1, 0, Math.PI * 2);
    c.ellipse(cx + hipOffset + 2, kneeY + 30, 11, 24, -0.1, 0, Math.PI * 2);
    c.stroke();

  } else if (angle === 'side') {
    // Side Muscle Outlines
    // Gluteus Maximus (둔근)
    c.beginPath();
    c.arc(cx + 14, top + 3.6 * hH, 24, Math.PI * 1.5, Math.PI * 0.5);
    c.stroke();
    // Hamstring vs Quad
    c.beginPath();
    c.moveTo(cx + 10, top + 4.0 * hH);
    c.quadraticCurveTo(cx + 18, top + 4.8 * hH, cx + 10, kneeY);
    c.stroke();
    // Calf (Gastrocnemius bulge)
    c.beginPath();
    c.moveTo(cx + 8, kneeY + 10);
    c.quadraticCurveTo(cx + 20, kneeY + 35, cx + 4, ankleY);
    c.stroke();
  }
}

// -------------------------------------------------------------
// 6. FINISHED LINE ART LAYER
// -------------------------------------------------------------
function drawLineArtLayer(c, angle, top, hH, cx, breath) {
  c.strokeStyle = '#ffffff';
  c.lineWidth = 2.2;
  c.lineCap = 'round';
  c.lineJoin = 'round';

  const headY = top + 0.5 * hH;
  const crotchY = top + 4.0 * hH;
  const kneeY = top + 5.9 * hH;
  const ankleY = top + 7.7 * hH;

  if (angle === 'front') {
    // Full Clean Body Contour
    c.beginPath();

    // Head Oval
    c.ellipse(cx, headY, hH * 0.28, hH * 0.36, 0, 0, Math.PI * 2);
    c.stroke();

    // Neck to Shoulders
    c.beginPath();
    // Left neck/shoulder
    c.moveTo(cx - 12, top + 0.85 * hH);
    c.quadraticCurveTo(cx - 18, top + 1.15 * hH, cx - hH * 0.82, top + 1.35 * hH);
    // Left Deltoid to Bicep
    c.quadraticCurveTo(cx - hH * 0.95, top + 1.8 * hH, cx - hH * 0.85, top + 2.3 * hH);
    // Left Forearm to Wrist
    c.quadraticCurveTo(cx - hH * 0.95, top + 3.1 * hH, cx - hH * 0.82, crotchY + 5);
    c.stroke();

    // Right neck/shoulder
    c.beginPath();
    c.moveTo(cx + 12, top + 0.85 * hH);
    c.quadraticCurveTo(cx + 18, top + 1.15 * hH, cx + hH * 0.82, top + 1.35 * hH);
    // Right Deltoid to Bicep
    c.quadraticCurveTo(cx + hH * 0.95, top + 1.8 * hH, cx + hH * 0.85, top + 2.3 * hH);
    // Right Forearm to Wrist
    c.quadraticCurveTo(cx + hH * 0.95, top + 3.1 * hH, cx + hH * 0.82, crotchY + 5);
    c.stroke();

    // Torso Outer Silhouette (Latissimus -> Waist -> Hip)
    c.beginPath();
    // Left Torso
    c.moveTo(cx - hH * 0.65, top + 1.6 * hH);
    c.quadraticCurveTo(cx - hH * 0.68, top + 2.2 * hH, cx - hH * 0.48, top + 2.9 * hH); // Waist indent
    c.quadraticCurveTo(cx - hH * 0.62, top + 3.5 * hH, cx - hH * 0.5, crotchY); // Hip
    c.stroke();

    // Right Torso
    c.beginPath();
    c.moveTo(cx + hH * 0.65, top + 1.6 * hH);
    c.quadraticCurveTo(cx + hH * 0.68, top + 2.2 * hH, cx + hH * 0.48, top + 2.9 * hH);
    c.quadraticCurveTo(cx + hH * 0.62, top + 3.5 * hH, cx + hH * 0.5, crotchY);
    c.stroke();

    // Legs Outer Silhouette
    const hOff = hH * 0.32;
    // Left Leg Outer & Inner
    c.beginPath();
    // Outer thigh & calf
    c.moveTo(cx - hH * 0.5, crotchY);
    c.quadraticCurveTo(cx - hOff - 22, top + 4.8 * hH, cx - hOff - 12, kneeY);
    c.quadraticCurveTo(cx - hOff - 20, top + 6.6 * hH, cx - hOff - 8, ankleY);
    c.stroke();

    c.beginPath();
    // Inner thigh & calf
    c.moveTo(cx, crotchY);
    c.quadraticCurveTo(cx - hOff + 14, top + 4.8 * hH, cx - hOff + 6, kneeY);
    c.quadraticCurveTo(cx - hOff + 16, top + 6.8 * hH, cx - hOff + 4, ankleY);
    c.stroke();

    // Right Leg Outer & Inner
    c.beginPath();
    // Outer
    c.moveTo(cx + hH * 0.5, crotchY);
    c.quadraticCurveTo(cx + hOff + 22, top + 4.8 * hH, cx + hOff + 12, kneeY);
    c.quadraticCurveTo(cx + hOff + 20, top + 6.6 * hH, cx + hOff + 8, ankleY);
    c.stroke();

    c.beginPath();
    // Inner
    c.moveTo(cx, crotchY);
    c.quadraticCurveTo(cx + hOff - 14, top + 4.8 * hH, cx + hOff - 6, kneeY);
    c.quadraticCurveTo(cx + hOff - 16, top + 6.8 * hH, cx + hOff - 4, ankleY);
    c.stroke();

    // Feet
    c.beginPath();
    c.moveTo(cx - hOff - 8, ankleY);
    c.lineTo(cx - hOff - 12, ankleY + 18);
    c.lineTo(cx - hOff + 10, ankleY + 18);
    c.lineTo(cx - hOff + 4, ankleY);
    c.stroke();

    c.beginPath();
    c.moveTo(cx + hOff + 8, ankleY);
    c.lineTo(cx + hOff + 12, ankleY + 18);
    c.lineTo(cx + hOff - 10, ankleY + 18);
    c.lineTo(cx + hOff - 4, ankleY);
    c.stroke();
  }
}

// -------------------------------------------------------------
// ANIMATION CYCLE
// -------------------------------------------------------------
function toggleAnimation() {
  state.isAnimating = !state.isAnimating;
  const btn = document.getElementById('animBtn');
  if (state.isAnimating) {
    btn.classList.add('bg-indigo-600', 'text-white');
    btn.querySelector('span').textContent = '애니메이션 정지';
    animLoop();
  } else {
    btn.classList.remove('bg-indigo-600', 'text-white');
    btn.querySelector('span').textContent = '포즈 호흡 애니메이션';
    if (state.animFrameId) cancelAnimationFrame(state.animFrameId);
    updateFigure();
  }
}

function animLoop() {
  if (!state.isAnimating) return;
  state.animTime++;
  updateFigure();
  state.animFrameId = requestAnimationFrame(animLoop);
}

function exportCanvasFigure() {
  const link = document.createElement('a');
  link.download = `human_figure_${state.currentAngle}_${state.headRatio}heads.png`;
  link.href = figureCanvas.toDataURL('image/png');
  link.click();
}

// ==========================================
// PRACTICE CANVAS STUDIO
// ==========================================
function initPracticeCanvasEvents() {
  const c = practiceDrawCanvas;
  if (!c) return;

  function getCoords(e) {
    const rect = c.getBoundingClientRect();
    const scaleX = c.width / rect.width;
    const scaleY = c.height / rect.height;
    if (e.touches && e.touches.length > 0) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  }

  function startDraw(e) {
    e.preventDefault();
    state.practice.isDrawing = true;
    const pos = getCoords(e);
    state.practice.lastX = pos.x;
    state.practice.lastY = pos.y;
    drawStroke(pos.x, pos.y);
  }

  function moveDraw(e) {
    if (!state.practice.isDrawing) return;
    e.preventDefault();
    const pos = getCoords(e);
    drawStroke(pos.x, pos.y);
  }

  function endDraw(e) {
    state.practice.isDrawing = false;
  }

  function drawStroke(x, y) {
    drawCtx.lineCap = 'round';
    drawCtx.lineJoin = 'round';

    if (state.practice.tool === 'pen') {
      drawCtx.globalCompositeOperation = 'source-over';
      drawCtx.strokeStyle = state.practice.color;
      drawCtx.lineWidth = state.practice.size;
    } else {
      drawCtx.globalCompositeOperation = 'destination-out';
      drawCtx.lineWidth = state.practice.size * 4;
    }

    drawCtx.beginPath();
    drawCtx.moveTo(state.practice.lastX, state.practice.lastY);
    drawCtx.lineTo(x, y);
    drawCtx.stroke();

    state.practice.lastX = x;
    state.practice.lastY = y;
  }

  // Mouse
  c.addEventListener('mousedown', startDraw);
  window.addEventListener('mousemove', moveDraw);
  window.addEventListener('mouseup', endDraw);

  // Touch
  c.addEventListener('touchstart', startDraw, { passive: false });
  window.addEventListener('touchmove', moveDraw, { passive: false });
  window.addEventListener('touchend', endDraw);
}

function setToolMode(mode) {
  state.practice.tool = mode;
  document.getElementById('tool-pen-btn').className = mode === 'pen' ? 'px-3 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-md' : 'px-3 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-1.5';
  document.getElementById('tool-eraser-btn').className = mode === 'eraser' ? 'px-3 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-md' : 'px-3 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-1.5';
}

function setBrushColor(color) {
  state.practice.color = color;
  setToolMode('pen');
}

function setBrushSize(size) {
  state.practice.size = parseInt(size);
  document.getElementById('brushSizeVal').textContent = `${size}px`;
}

function setBgOpacity(op) {
  state.practice.bgOpacity = parseFloat(op);
  document.getElementById('bgOpacityVal').textContent = `${Math.round(op * 100)}%`;
  renderPracticeBackground();
}

function setPracticeBackgroundTemplate(tmpl) {
  state.practice.bgTemplate = tmpl;
  renderPracticeBackground();
}

function clearPracticeCanvas() {
  if (!drawCtx) return;
  drawCtx.clearRect(0, 0, practiceDrawCanvas.width, practiceDrawCanvas.height);
}

function renderPracticeBackground() {
  if (!bgCtx) return;
  const w = practiceBgCanvas.width;
  const h = practiceBgCanvas.height;

  bgCtx.clearRect(0, 0, w, h);
  bgCtx.fillStyle = '#060913';
  bgCtx.fillRect(0, 0, w, h);

  const tmpl = state.practice.bgTemplate;
  if (tmpl === 'blank') return;

  const imgMap = {
    figure_proportions: 'assets/figure_proportions.jpg',
    gesture_poses: 'assets/gesture_poses.jpg',
    head_facial: 'assets/head_facial.jpg',
    hands_feet: 'assets/hands_feet.jpg'
  };

  if (imgMap[tmpl]) {
    const img = new Image();
    img.src = imgMap[tmpl];
    img.onload = () => {
      bgCtx.save();
      bgCtx.globalAlpha = state.practice.bgOpacity;
      // Draw image fitted
      const ratio = Math.min(w / img.width, h / img.height);
      const nw = img.width * ratio;
      const nh = img.height * ratio;
      const ox = (w - nw) / 2;
      const oy = (h - nh) / 2;
      bgCtx.drawImage(img, ox, oy, nw, nh);
      bgCtx.restore();
    };
  } else if (tmpl === 'grid_only') {
    // Pure Grid
    bgCtx.save();
    bgCtx.globalAlpha = state.practice.bgOpacity;
    bgCtx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
    bgCtx.lineWidth = 1;
    for (let x = 0; x < w; x += 40) {
      bgCtx.beginPath();
      bgCtx.moveTo(x, 0);
      bgCtx.lineTo(x, h);
      bgCtx.stroke();
    }
    for (let y = 0; y < h; y += 40) {
      bgCtx.beginPath();
      bgCtx.moveTo(0, y);
      bgCtx.lineTo(w, y);
      bgCtx.stroke();
    }
    bgCtx.restore();
  }
}

function downloadPracticeArtwork() {
  // Combine bg and draw canvas
  const mergeCanvas = document.createElement('canvas');
  mergeCanvas.width = practiceDrawCanvas.width;
  mergeCanvas.height = practiceDrawCanvas.height;
  const mCtx = mergeCanvas.getContext('2d');

  // Background
  mCtx.drawImage(practiceBgCanvas, 0, 0);
  // Drawing
  mCtx.drawImage(practiceDrawCanvas, 0, 0);

  const link = document.createElement('a');
  link.download = `my_figure_practice_${Date.now()}.png`;
  link.href = mergeCanvas.toDataURL('image/png');
  link.click();
}
