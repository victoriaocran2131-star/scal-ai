const { createCanvas } = require('@napi-rs/canvas');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, '..', 'app-store-screenshots');
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// 6.5" iPhone (iPhone 11 Pro Max / 12 Pro Max / 13 Pro Max / 14 Plus)
const W = 1284;
const H = 2778;

const COLORS = {
  bg: '#0a0a0a',
  card: '#1a1a1a',
  accent: '#4CAF50',
  accentAlt: '#2196F3',
  text: '#ffffff',
  textDim: '#888888',
  border: '#333333',
  gradientTop: '#1a1a2e',
  gradientBot: '#0a0a0a',
};

function drawRoundedRect(ctx, x, y, w, h, r, fill) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

function drawProgressBar(ctx, x, y, w, h, pct, color) {
  drawRoundedRect(ctx, x, y, w, h, h/2, '#222');
  drawRoundedRect(ctx, x, y, Math.max(h, w * pct), h, h/2, color);
}

function drawCircle(ctx, cx, cy, r, color) {
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
}

function drawText(ctx, text, x, y, size, color, align = 'left') {
  ctx.font = `${size}px sans-serif`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.fillText(text, x, y);
}

function drawStatusBar(ctx) {
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, W, 80);
  drawText(ctx, '9:41', 40, 55, 32, COLORS.text, 'left');
  // signal, wifi, battery icons simplified
  drawRoundedRect(ctx, W - 160, 30, 50, 24, 4, '#333');
  drawRoundedRect(ctx, W - 158, 32, 40, 20, 3, COLORS.accent);
  drawCircle(ctx, W - 110, 42, 5, '#333');
}

// ===== SCREEN 1: Welcome / Hero =====
function screen1() {
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  // Background gradient
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#1a1a2e');
  grad.addColorStop(0.5, '#16213e');
  grad.addColorStop(1, '#0a0a0a');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  drawStatusBar(ctx);

  // App icon area
  drawRoundedRect(ctx, W/2 - 140, 300, 280, 280, 50, COLORS.accent);
  drawText(ctx, '🍎', W/2, 480, 120, '#fff', 'center');

  // App name
  drawText(ctx, 'Scal AI', W/2, 680, 72, COLORS.text, 'center');
  drawText(ctx, 'Your Smart Food Scanner', W/2, 740, 36, COLORS.textDim, 'center');

  // Feature cards
  const features = [
    { icon: '📸', title: 'Smart Scanner', desc: 'Point camera at any food' },
    { icon: '📊', title: 'Track Nutrition', desc: 'Calories, protein, fat & more' },
    { icon: '📈', title: 'Visual Charts', desc: 'See your progress' },
    { icon: '⏰', title: 'Meal Reminders', desc: 'Never miss a meal' },
  ];

  features.forEach((f, i) => {
    const y = 880 + i * 180;
    drawRoundedRect(ctx, 80, y, W - 160, 150, 20, COLORS.card);
    drawText(ctx, f.icon, 130, y + 70, 50, '#fff', 'left');
    drawText(ctx, f.title, 210, y + 55, 32, COLORS.text, 'left');
    drawText(ctx, f.desc, 210, y + 100, 26, COLORS.textDim, 'left');
  });

  // CTA Button
  drawRoundedRect(ctx, 140, H - 300, W - 280, 90, 45, COLORS.accent);
  drawText(ctx, 'Get Started', W/2, H - 252, 36, '#fff', 'center');

  return canvas;
}

// ===== SCREEN 2: Camera Scanner =====
function screen2() {
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#111';
  ctx.fillRect(0, 0, W, H);
  drawStatusBar(ctx);

  // Camera viewfinder area
  drawRoundedRect(ctx, 60, 120, W - 120, H - 500, 30, '#1a1a1a');

  // Scan frame corners
  const fx = 120, fy = 200, fw = W - 240, fh = H - 700;
  ctx.strokeStyle = COLORS.accent;
  ctx.lineWidth = 6;
  // Top-left
  ctx.beginPath(); ctx.moveTo(fx, fy + 60); ctx.lineTo(fx, fy); ctx.lineTo(fx + 60, fy); ctx.stroke();
  // Top-right
  ctx.beginPath(); ctx.moveTo(fx + fw - 60, fy); ctx.lineTo(fx + fw, fy); ctx.lineTo(fx + fw, fy + 60); ctx.stroke();
  // Bottom-left
  ctx.beginPath(); ctx.moveTo(fx, fh - 60); ctx.lineTo(fx, fh); ctx.lineTo(fx + 60, fh); ctx.stroke();
  // Bottom-right
  ctx.beginPath(); ctx.moveTo(fx + fw - 60, fh); ctx.lineTo(fx + fw, fh); ctx.lineTo(fx + fw, fh - 60); ctx.stroke();

  // Scanning line animation
  ctx.strokeStyle = COLORS.accent;
  ctx.lineWidth = 3;
  ctx.globalAlpha = 0.6;
  ctx.beginPath(); ctx.moveTo(fx + 20, fy + fh * 0.4); ctx.lineTo(fx + fw - 20, fy + fh * 0.4); ctx.stroke();
  ctx.globalAlpha = 1;

  // Food icon in center
  drawText(ctx, '🍎', W/2, H/2 - 80, 120, '#fff', 'center');
  drawText(ctx, 'Point camera at food', W/2, H/2 + 40, 32, COLORS.textDim, 'center');

  // Scan button
  drawCircle(ctx, W/2, H - 200, 60, COLORS.accent);
  drawCircle(ctx, W/2, H - 200, 45, '#fff');
  drawCircle(ctx, W/2, H - 200, 30, COLORS.accent);

  drawText(ctx, 'Tap to Scan', W/2, H - 110, 28, COLORS.textDim, 'center');

  return canvas;
}

// ===== SCREEN 3: Scan Results =====
function screen3() {
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, W, H);
  drawStatusBar(ctx);

  drawText(ctx, 'Scan Result', W/2, 130, 40, COLORS.text, 'center');

  // Food image placeholder
  drawRoundedRect(ctx, 100, 180, W - 200, 350, 20, '#1e1e1e');
  drawText(ctx, '🥗', W/2, 400, 120, '#fff', 'center');

  // Impact badge
  drawRoundedRect(ctx, W/2 - 100, 550, 200, 50, 25, '#1b5e20');
  drawText(ctx, '🟢 Low Impact', W/2, 583, 24, COLORS.accent, 'center');

  // Nutrition cards
  const nutrients = [
    { label: 'Calories', value: '186 kcal', color: COLORS.accent, pct: 0.37 },
    { label: 'Protein', value: '12g', color: COLORS.accentAlt, pct: 0.24 },
    { label: 'Fat', value: '8g', color: '#FF9800', pct: 0.12 },
    { label: 'Carbs', value: '22g', color: '#E91E63', pct: 0.07 },
  ];

  drawRoundedRect(ctx, 60, 630, W - 120, 480, 20, COLORS.card);
  drawText(ctx, 'Nutrition Facts', 100, 690, 32, COLORS.text, 'left');

  nutrients.forEach((n, i) => {
    const y = 730 + i * 90;
    drawText(ctx, n.label, 100, y, 28, COLORS.textDim, 'left');
    drawText(ctx, n.value, W - 100, y, 28, COLORS.text, 'right');
    drawProgressBar(ctx, 100, y + 15, W - 200, 12, n.pct, n.color);
  });

  // Action buttons
  drawRoundedRect(ctx, 60, H - 350, W/2 - 80, 80, 15, COLORS.accent);
  drawText(ctx, '✅ Add to Log', 60 + (W/2 - 80)/2, H - 307, 26, '#fff', 'center');

  drawRoundedRect(ctx, W/2 + 20, H - 350, W/2 - 80, 80, 15, COLORS.card);
  drawText(ctx, '📸 Scan Again', W/2 + 20 + (W/2 - 80)/2, H - 307, 26, COLORS.text, 'center');

  return canvas;
}

// ===== SCREEN 4: Daily Dashboard =====
function screen4() {
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, W, H);
  drawStatusBar(ctx);

  drawText(ctx, 'Today\'s Progress', W/2, 130, 40, COLORS.text, 'center');
  drawText(ctx, 'Thursday, Aug 14', W/2, 175, 28, COLORS.textDim, 'center');

  // Circular progress
  const cx = W/2, cy = 380, r = 140;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.strokeStyle = '#222'; ctx.lineWidth = 20; ctx.stroke();
  ctx.beginPath(); ctx.arc(cx, cy, r, -Math.PI/2, -Math.PI/2 + Math.PI * 1.4); ctx.strokeStyle = COLORS.accent; ctx.lineWidth = 20; ctx.stroke();
  drawText(ctx, '847', cx, cy - 10, 56, COLORS.text, 'center');
  drawText(ctx, 'kcal consumed', cx, cy + 35, 24, COLORS.textDim, 'center');
  drawText(ctx, '1,153 remaining', cx, cy + 70, 22, COLORS.accent, 'center');

  // Macro bars
  const macros = [
    { label: 'Protein', value: '45g / 50g', pct: 0.9, color: COLORS.accentAlt },
    { label: 'Fat', value: '28g / 65g', pct: 0.43, color: '#FF9800' },
    { label: 'Carbs', value: '98g / 300g', pct: 0.33, color: '#E91E63' },
  ];

  drawRoundedRect(ctx, 60, 620, W - 120, 340, 20, COLORS.card);
  macros.forEach((m, i) => {
    const y = 680 + i * 100;
    drawText(ctx, m.label, 100, y, 28, COLORS.text, 'left');
    drawText(ctx, m.value, W - 100, y, 26, COLORS.textDim, 'right');
    drawProgressBar(ctx, 100, y + 15, W - 200, 14, m.pct, m.color);
  });

  // Recent meals
  drawText(ctx, 'Recent Meals', 80, 1020, 32, COLORS.text, 'left');
  const meals = [
    { name: 'Oatmeal with berries', cal: 320, time: '8:30 AM' },
    { name: 'Grilled chicken salad', cal: 412, time: '12:15 PM' },
    { name: 'Apple', cal: 95, time: '3:00 PM' },
  ];
  meals.forEach((m, i) => {
    const y = 1060 + i * 100;
    drawRoundedRect(ctx, 60, y, W - 120, 80, 12, COLORS.card);
    drawText(ctx, m.name, 100, y + 45, 26, COLORS.text, 'left');
    drawText(ctx, `${m.cal} kcal`, W - 100, y + 35, 24, COLORS.accent, 'right');
    drawText(ctx, m.time, W - 100, y + 65, 20, COLORS.textDim, 'right');
  });

  return canvas;
}

// ===== SCREEN 5: Charts =====
function screen5() {
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, W, H);
  drawStatusBar(ctx);

  drawText(ctx, 'Weekly Overview', W/2, 130, 40, COLORS.text, 'center');

  // Chart area
  drawRoundedRect(ctx, 60, 180, W - 120, 400, 20, COLORS.card);
  drawText(ctx, 'Calories', 100, 240, 28, COLORS.text, 'left');
  drawText(ctx, 'Avg: 1,820 kcal', W - 100, 240, 24, COLORS.accent, 'right');

  // Bar chart
  const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const values = [0.75, 0.85, 0.65, 0.9, 0.7, 0.55, 0.8];
  const barW = 80;
  const startX = 120;
  days.forEach((d, i) => {
    const x = startX + i * (barW + 50);
    const barH = values[i] * 250;
    const y = 530 - barH;
    const color = i === 3 ? COLORS.accent : '#333';
    drawRoundedRect(ctx, x, y, barW, barH, 8, color);
    drawText(ctx, d, x + barW/2, 570, 24, COLORS.textDim, 'center');
  });

  // Weekly summary cards
  const summary = [
    { label: 'Avg Calories', value: '1,820', unit: 'kcal/day' },
    { label: 'Total Protein', value: '312g', unit: 'this week' },
    { label: 'Scans', value: '23', unit: 'this week' },
  ];

  summary.forEach((s, i) => {
    const x = 60 + i * (W - 120) / 3;
    const y = 640;
    drawRoundedRect(ctx, x + 10, y, (W - 120) / 3 - 20, 150, 15, COLORS.card);
    drawText(ctx, s.value, x + (W - 120) / 6, y + 60, 36, COLORS.accent, 'center');
    drawText(ctx, s.unit, x + (W - 120) / 6, y + 95, 20, COLORS.textDim, 'center');
    drawText(ctx, s.label, x + (W - 120) / 6, y + 130, 20, COLORS.text, 'center');
  });

  // Trend line description
  drawRoundedRect(ctx, 60, 840, W - 120, 120, 15, COLORS.card);
  drawText(ctx, '📈 Your calorie intake is on track!', 100, 900, 26, COLORS.accent, 'left');

  // Bottom insight
  drawRoundedRect(ctx, 60, 1000, W - 120, 200, 20, '#1a2332');
  drawText(ctx, '💡 Insight', 100, 1060, 28, COLORS.accentAlt, 'left');
  drawText(ctx, 'You\'re 15% under your protein goal.', 100, 1100, 24, COLORS.text, 'left');
  drawText(ctx, 'Try adding more lean meats or eggs.', 100, 1135, 24, COLORS.textDim, 'left');

  return canvas;
}

// ===== SCREEN 6: Subscription =====
function screen6() {
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#1a1a2e');
  grad.addColorStop(1, '#0a0a0a');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
  drawStatusBar(ctx);

  drawText(ctx, 'Unlock Full Access', W/2, 200, 44, COLORS.text, 'center');
  drawText(ctx, 'Choose the plan that works for you', W/2, 260, 28, COLORS.textDim, 'center');

  // Plans
  const plans = [
    { name: 'Weekly', price: '$1.99', period: '/week', popular: false },
    { name: 'Monthly', price: '$7.99', period: '/month', popular: true },
    { name: 'Yearly', price: '$49.99', period: '/year', popular: false, badge: 'Save 60%' },
  ];

  plans.forEach((p, i) => {
    const y = 350 + i * 260;
    const borderColor = p.popular ? COLORS.accent : COLORS.border;
    drawRoundedRect(ctx, 80, y, W - 160, 230, 20, COLORS.card);

    if (p.popular) {
      drawRoundedRect(ctx, W/2 - 60, y - 20, 120, 36, 18, COLORS.accent);
      drawText(ctx, 'Most Popular', W/2, y + 2, 20, '#fff', 'center');
    }

    drawText(ctx, p.name, 130, y + 60, 32, COLORS.text, 'left');
    drawText(ctx, p.price, W - 130, y + 65, 40, COLORS.text, 'right');
    drawText(ctx, p.period, W - 130, y + 100, 22, COLORS.textDim, 'right');

    if (p.badge) {
      drawRoundedRect(ctx, W - 280, y + 25, 100, 32, 16, '#FF9800');
      drawText(ctx, p.badge, W - 230, y + 48, 18, '#fff', 'center');
    }

    // Features
    const features = ['Food Scanning', 'Nutrition Tracking', 'Charts'];
    features.forEach((f, fi) => {
      drawText(ctx, `✓ ${f}`, 130, y + 140 + fi * 30, 22, COLORS.accent, 'left');
    });
  });

  // Subscribe button
  drawRoundedRect(ctx, 140, H - 250, W - 280, 90, 45, COLORS.accent);
  drawText(ctx, 'Subscribe Now', W/2, H - 202, 36, '#fff', 'center');

  drawText(ctx, 'Cancel anytime. No hidden fees.', W/2, H - 140, 22, COLORS.textDim, 'center');

  return canvas;
}

// Generate all screenshots
const screens = [
  { fn: screen1, name: '01-welcome.png' },
  { fn: screen2, name: '02-scanner.png' },
  { fn: screen3, name: '03-results.png' },
  { fn: screen4, name: '04-dashboard.png' },
  { fn: screen5, name: '05-charts.png' },
  { fn: screen6, name: '06-subscription.png' },
];

screens.forEach(({ fn, name }) => {
  const canvas = fn();
  const buffer = canvas.toBuffer('image/png');
  const outPath = path.join(OUTPUT_DIR, name);
  fs.writeFileSync(outPath, buffer);
  console.log(`Created: ${outPath} (${(buffer.length / 1024).toFixed(0)} KB)`);
});

console.log(`\nAll screenshots saved to: ${OUTPUT_DIR}`);
