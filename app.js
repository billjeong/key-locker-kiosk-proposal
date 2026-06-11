document.addEventListener('DOMContentLoaded', () => {

  const TOTAL_LOCKERS = 20;
  const MOCK_PLATES = ['12가3456', '34나7890', '56다1234', '78라5678'];

  let currentSlide = 1;
  const totalSlides = 7;
  let activeMode = 'pitch';
  let selectedLockerId = null;
  let clockInterval = null;

  // Locker state store
  const lockers = Array.from({ length: TOTAL_LOCKERS }, (_, i) => ({
    id: i + 1,
    status: 'EMPTY',
    plate: null,
    pin: null
  }));

  // Pre-seed some lockers for demo
  function seedLockers() {
    lockers[2] = { id: 3, status: 'RENTED', plate: '12가3456', pin: '4821' };
    lockers[7] = { id: 8, status: 'AVAILABLE', plate: null, pin: null };
    lockers[11] = { id: 12, status: 'RESERVED', plate: '34나7890', pin: '7392' };
    lockers[15] = { id: 16, status: 'DOOR_OPEN', plate: '56다1234', pin: null };
  }
  seedLockers();

  // DOM refs
  const pitchContainer = document.getElementById('pitch-container');
  const dashboardContainer = document.getElementById('dashboard-container');
  const slideIndicator = document.getElementById('slide-indicator');
  const navControls = document.getElementById('slide-nav-controls');
  const lockerGrid = document.getElementById('locker-grid');
  const kioskBody = document.getElementById('kiosk-body');
  const eventLogBox = document.getElementById('event-log-box');
  const screenClock = document.getElementById('screen-clock');

  // ==========================================
  // SLIDE NAVIGATION
  // ==========================================
  function updateSlideView() {
    for (let i = 1; i <= totalSlides; i++) {
      const slide = document.getElementById(`slide-${i}`);
      if (slide) slide.classList.toggle('active', i === currentSlide);
    }
    slideIndicator.textContent = `${currentSlide} / ${totalSlides}`;
    document.getElementById('btn-prev').disabled = currentSlide === 1;
    document.getElementById('btn-next').disabled = currentSlide === totalSlides;
  }

  document.getElementById('btn-next').addEventListener('click', () => { if (currentSlide < totalSlides) { currentSlide++; updateSlideView(); } });
  document.getElementById('btn-prev').addEventListener('click', () => { if (currentSlide > 1) { currentSlide--; updateSlideView(); } });
  document.getElementById('btn-start-pitch').addEventListener('click', () => { currentSlide = 2; updateSlideView(); });
  document.getElementById('btn-jump-db').addEventListener('click', () => switchMode('dashboard'));
  document.getElementById('btn-conclusion-demo').addEventListener('click', () => switchMode('dashboard'));

  document.addEventListener('keydown', (e) => {
    if (activeMode !== 'pitch') return;
    if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); if (currentSlide < totalSlides) { currentSlide++; updateSlideView(); } }
    if (e.key === 'ArrowLeft') { if (currentSlide > 1) { currentSlide--; updateSlideView(); } }
  });

  // ==========================================
  // MODE TOGGLE
  // ==========================================
  function switchMode(mode) {
    activeMode = mode;
    const btnPitch = document.getElementById('btn-mode-pitch');
    const btnDash = document.getElementById('btn-mode-dashboard');
    if (mode === 'pitch') {
      btnPitch.classList.add('active');
      btnDash.classList.remove('active');
      pitchContainer.style.display = 'flex';
      dashboardContainer.classList.remove('active');
      navControls.style.display = 'flex';
      stopClock();
      updateSlideView();
    } else {
      btnPitch.classList.remove('active');
      btnDash.classList.add('active');
      pitchContainer.style.display = 'none';
      dashboardContainer.classList.add('active');
      navControls.style.display = 'none';
      renderLockerGrid();
      resetKioskDemo();
      startClock();
      logEvent('키오스크 데모 모드 활성화.');
    }
  }

  document.getElementById('btn-mode-pitch').addEventListener('click', () => switchMode('pitch'));
  document.getElementById('btn-mode-dashboard').addEventListener('click', () => switchMode('dashboard'));

  // ==========================================
  // SLIDE 2: CONGESTION SIMULATOR
  // ==========================================
  const congestionSlider = document.getElementById('congestion-slider');
  if (congestionSlider) {
    congestionSlider.addEventListener('input', (e) => {
      const v = parseInt(e.target.value);
      const label = document.getElementById('congestion-label');
      const wait = document.getElementById('val-wait');
      const loss = document.getElementById('val-loss');
      const staff = document.getElementById('val-staff');
      const waitCard = document.getElementById('wait-card');
      const lossCard = document.getElementById('loss-card');
      const staffCard = document.getElementById('staff-card');

      let timeLabel = '한산 (오전)';
      if (v > 30 && v <= 60) timeLabel = '보통 (점심)';
      if (v > 60) timeLabel = '피크 (퇴근)';
      label.textContent = timeLabel;

      const waitMin = Math.round(2 + v * 0.18);
      wait.textContent = `${waitMin}분`;
      wait.className = 'metric-value ' + (waitMin > 12 ? 'red' : waitMin > 7 ? 'cyan' : 'blue');

      const lossLevels = ['낮음', '중간', '높음', '매우 높음'];
      const lossIdx = Math.min(3, Math.floor(v / 28));
      loss.textContent = lossLevels[lossIdx];
      loss.className = 'metric-value ' + (lossIdx >= 2 ? 'red' : lossIdx === 1 ? 'cyan' : 'green');

      const staffLevels = ['낮음', '보통', '높음', '과부하'];
      const staffIdx = Math.min(3, Math.floor(v / 26));
      staff.textContent = staffLevels[staffIdx];
      staff.className = 'metric-value ' + (staffIdx >= 2 ? 'red' : staffIdx === 1 ? 'cyan' : 'green');

      [waitCard, lossCard, staffCard].forEach(c => c.classList.remove('alert-active'));
      if (v > 65) { waitCard.classList.add('alert-active'); lossCard.classList.add('alert-active'); staffCard.classList.add('alert-active'); }
    });
  }

  // ==========================================
  // SLIDE 3: ARCHITECTURE DIAGRAM
  // ==========================================
  const nodeItems = document.querySelectorAll('.node-item');
  const archNodes = ['ui', 'io', 'sensor', 'api', 'admin'];

  function highlightArch(nodeName) {
    for (let i = 0; i < 4; i++) {
      const flow = document.getElementById(`flow-${i + 1}`);
      if (flow) flow.style.display = 'none';
    }
    archNodes.forEach(n => {
      const el = document.getElementById(`svg-${n}`);
      if (el) el.setAttribute('stroke', '#334155');
    });
    const idx = archNodes.indexOf(nodeName);
    for (let i = 0; i < idx; i++) {
      const flow = document.getElementById(`flow-${i + 1}`);
      if (flow) flow.style.display = 'block';
    }
    for (let i = 0; i <= idx; i++) {
      const el = document.getElementById(`svg-${archNodes[i]}`);
      if (el) el.setAttribute('stroke', '#3b82f6');
    }
  }

  nodeItems.forEach(item => {
    item.addEventListener('click', () => {
      nodeItems.forEach(n => n.classList.remove('selected'));
      item.classList.add('selected');
      highlightArch(item.getAttribute('data-node'));
    });
  });
  highlightArch('ui');

  // ==========================================
  // SLIDE 4: SCENARIO WIDGET
  // ==========================================
  let slideScenario = 'deposit';
  let slideInput = '';
  let slideStepIndex = 0;
  const depositSteps = ['차량번호 입력', '빈 보관함 배정', '보관함 문 열림', '키 투입 · 문 닫힘', '접수 완료'];
  const pickupSteps = ['차량번호 입력', 'PIN 비밀번호 입력', '본인 확인', '보관함 개방', '키 수령 완료'];

  function renderScenarioSteps() {
    const container = document.getElementById('scenario-steps');
    if (!container) return;
    const steps = slideScenario === 'deposit' ? depositSteps : pickupSteps;
    container.innerHTML = steps.map((s, i) =>
      `<div class="step-item ${i === slideStepIndex ? 'active' : ''}"><span class="step-num">${i + 1}</span><span>${s}</span></div>`
    ).join('');
  }

  document.getElementById('btn-scenario-deposit').addEventListener('click', () => {
    slideScenario = 'deposit';
    document.getElementById('btn-scenario-deposit').classList.add('active');
    document.getElementById('btn-scenario-pickup').classList.remove('active');
    slideStepIndex = 0;
    slideInput = '';
    updateSlideKeypadDisplay();
    renderScenarioSteps();
  });

  document.getElementById('btn-scenario-pickup').addEventListener('click', () => {
    slideScenario = 'pickup';
    document.getElementById('btn-scenario-pickup').classList.add('active');
    document.getElementById('btn-scenario-deposit').classList.remove('active');
    slideStepIndex = 0;
    slideInput = '';
    updateSlideKeypadDisplay();
    renderScenarioSteps();
  });

  function updateSlideKeypadDisplay() {
    const el = document.getElementById('slide-keypad-display');
    if (!el) return;
    if (slideScenario === 'pickup' && slideStepIndex >= 1) {
      el.textContent = slideInput ? '•'.repeat(slideInput.length).padEnd(4, '•') : '____';
    } else {
      const formatted = slideInput.replace(/(\d{2})(\d{0,4})/, (_, a, b) => b ? `${a}${b.slice(0, 2)} ${b.slice(2)}` : a);
      el.textContent = formatted || '___ ___';
    }
  }

  document.getElementById('slide-keypad').addEventListener('click', (e) => {
    const btn = e.target.closest('.keypad-btn');
    if (!btn) return;
    const key = btn.getAttribute('data-key');
    if (key === 'del') { slideInput = slideInput.slice(0, -1); }
    else if (key === 'ok') { runSlideScenarioStep(); return; }
    else if (slideInput.length < 8) { slideInput += key; }
    updateSlideKeypadDisplay();
  });

  function runSlideScenarioStep() {
    const steps = slideScenario === 'deposit' ? depositSteps : pickupSteps;
    if (slideStepIndex < steps.length - 1) {
      slideStepIndex++;
      slideInput = '';
      updateSlideKeypadDisplay();
      renderScenarioSteps();
    }
  }

  document.getElementById('btn-run-scenario').addEventListener('click', () => {
    slideStepIndex = 0;
    slideInput = '';
    updateSlideKeypadDisplay();
    renderScenarioSteps();
    let i = 0;
    const interval = setInterval(() => {
      if (i < (slideScenario === 'deposit' ? depositSteps : pickupSteps).length - 1) {
        slideStepIndex = i + 1;
        renderScenarioSteps();
        i++;
      } else {
        clearInterval(interval);
      }
    }, 1200);
  });

  renderScenarioSteps();

  // ==========================================
  // SLIDE 6: ROADMAP
  // ==========================================
  const roadmapTasks = [
    'task-poc-1', 'task-poc-2', 'task-main-1', 'task-main-2', 'task-main-3', 'task-ext-1', 'task-ext-2'
  ].map(id => document.getElementById(id)).filter(Boolean);

  document.querySelectorAll('.roadmap-phase').forEach(phase => {
    phase.addEventListener('click', (e) => {
      if (e.target.tagName === 'INPUT') return;
      document.querySelectorAll('.roadmap-phase').forEach(p => p.classList.remove('active'));
      phase.classList.add('active');
    });
  });

  function updateRoadmapProgress() {
    let done = 2;
    roadmapTasks.forEach(t => { if (t.checked) done++; });
    const pct = Math.round((done / 9) * 100);
    document.getElementById('roadmap-progress-text').textContent = `${pct}%`;
    document.getElementById('roadmap-progress-fill').style.width = `${pct}%`;
  }
  roadmapTasks.forEach(t => t.addEventListener('change', updateRoadmapProgress));
  updateRoadmapProgress();

  // ==========================================
  // LOCKER GRID (ADMIN DASHBOARD)
  // ==========================================
  function statusClass(status) {
    const map = {
      EMPTY: 'empty', AVAILABLE: 'available', RESERVED: 'reserved',
      RENTED: 'rented', RETURNED: 'available', DOOR_OPEN: 'door_open', DOOR_ERROR: 'door_error'
    };
    return map[status] || 'empty';
  }

  function findEmptyLocker() {
    return lockers.find(l => l.status === 'EMPTY' || l.status === 'AVAILABLE');
  }

  function findLockerByPlate(plate) {
    return lockers.find(l => l.plate === plate && ['RENTED', 'RESERVED', 'RETURNED'].includes(l.status));
  }

  function renderLockerGrid() {
    if (!lockerGrid) return;
    lockerGrid.innerHTML = lockers.map(l => `
      <div class="locker-cell ${statusClass(l.status)} ${selectedLockerId === l.id ? 'selected' : ''}"
           data-id="${l.id}" title="${l.plate || l.status}">
        <span class="locker-id">${l.id}</span>
        <span class="locker-status">${l.status}</span>
      </div>
    `).join('');

    lockerGrid.querySelectorAll('.locker-cell').forEach(cell => {
      cell.addEventListener('click', () => {
        selectedLockerId = parseInt(cell.getAttribute('data-id'));
        const locker = lockers.find(x => x.id === selectedLockerId);
        document.getElementById('detail-locker').textContent = `#${locker.id}`;
        document.getElementById('detail-status').textContent = locker.status;
        document.getElementById('detail-plate').textContent = locker.plate ? maskPlate(locker.plate) : '—';
        renderLockerGrid();
      });
    });
  }

  function maskPlate(plate) {
    if (plate.length <= 4) return plate;
    return plate.slice(0, 2) + '**' + plate.slice(-2);
  }

  function setLockerStatus(id, status, plate, pin) {
    const l = lockers.find(x => x.id === id);
    if (!l) return;
    l.status = status;
    if (plate !== undefined) l.plate = plate;
    if (pin !== undefined) l.pin = pin;
    renderLockerGrid();
  }

  document.getElementById('btn-test-door').addEventListener('click', () => {
    if (!selectedLockerId) {
      logEvent('보관함을 먼저 선택하세요.');
      return;
    }
    const prev = lockers.find(x => x.id === selectedLockerId).status;
    setLockerStatus(selectedLockerId, 'DOOR_OPEN');
    logEvent(`[원격] 보관함 #${selectedLockerId} 도어 테스트 개방.`);
    setTimeout(() => {
      setLockerStatus(selectedLockerId, prev === 'DOOR_OPEN' ? 'RENTED' : prev);
      logEvent(`[원격] 보관함 #${selectedLockerId} 도어 닫힘 확인.`);
    }, 2500);
  });

  // ==========================================
  // KIOSK DEMO SIMULATOR
  // ==========================================
  let kioskState = { screen: 'home', step: 0, plate: '', pin: '', assignedLocker: null };
  let kioskTimeouts = [];
  let autoplayEnabled = false;

  const kioskScreens = {
    home: () => `
      <div class="kiosk-step-bar">메인 화면</div>
      <div class="kiosk-title">무인 키 보관함</div>
      <div class="kiosk-subtitle">차량 키를 맡기거나 찾으려면 아래 버튼을 선택하세요.</div>
      <div class="kiosk-menu">
        <button class="kiosk-menu-btn" data-action="deposit">🗝️ 차량키 맡기기</button>
        <button class="kiosk-menu-btn" data-action="pickup">🔑 차량키 찾기</button>
        <button class="kiosk-menu-btn secondary" data-action="technician">🔧 정비사 메뉴</button>
      </div>
    `,
    input_plate: (label) => `
      <div class="kiosk-step-bar">단계 ${kioskState.step}/4</div>
      <div class="kiosk-title">${label || '차량번호 입력'}</div>
      <div class="kiosk-subtitle">번호판을 입력해 주세요.</div>
      <div class="keypad-display" id="kiosk-display">${formatPlate(kioskState.plate)}</div>
      <div class="keypad" id="kiosk-keypad">
        ${[1,2,3,4,5,6,7,8,9,'del',0,'ok'].map(k =>
          `<button class="keypad-btn" data-key="${k}">${k === 'del' ? '⌫' : k === 'ok' ? '확인' : k}</button>`
        ).join('')}
      </div>
      <button class="kiosk-menu-btn secondary" data-action="home" style="margin-top:0.5rem;padding:0.6rem;">← 처음으로</button>
    `,
    input_pin: () => `
      <div class="kiosk-step-bar">단계 2/4</div>
      <div class="kiosk-title">비밀번호 입력</div>
      <div class="kiosk-subtitle">문자로 받으신 4자리 PIN을 입력하세요.</div>
      <div class="keypad-display" id="kiosk-display">${'•'.repeat(kioskState.pin.length).padEnd(4, '○')}</div>
      <div class="keypad" id="kiosk-keypad">
        ${[1,2,3,4,5,6,7,8,9,'del',0,'ok'].map(k =>
          `<button class="keypad-btn" data-key="${k}">${k === 'del' ? '⌫' : k === 'ok' ? '확인' : k}</button>`
        ).join('')}
      </div>
    `,
    assigned: () => `
      <div class="kiosk-step-bar">단계 3/4</div>
      <div class="kiosk-title">보관함이 배정되었습니다</div>
      <div class="kiosk-locker-assigned">
        <div style="font-size:0.85rem;color:#94A3B8;margin-bottom:0.5rem;">보관함 번호</div>
        <div class="locker-num-big">#${kioskState.assignedLocker}</div>
        <div class="door-animation open" id="door-anim"><div class="door-panel"></div></div>
        <div class="kiosk-subtitle">키를 넣고 문을 닫아 주세요.</div>
      </div>
    `,
    complete: (msg) => `
      <div class="kiosk-step-bar">완료</div>
      <div class="kiosk-title" style="color:var(--accent-green);">✓ ${msg || '처리가 완료되었습니다'}</div>
      <div class="kiosk-subtitle">이용해 주셔서 감사합니다.</div>
      <button class="kiosk-menu-btn" data-action="home" style="margin-top:1rem;">처음으로</button>
    `,
    error: (msg) => `
      <div class="kiosk-step-bar">오류</div>
      <div class="kiosk-title" style="color:var(--accent-red);">⚠ ${msg}</div>
      <button class="kiosk-menu-btn" data-action="home" style="margin-top:1rem;">처음으로</button>
    `
  };

  function formatPlate(p) {
    if (!p) return '___ ___';
    return p.length > 2 ? p.slice(0, 2) + (p.length > 2 ? ' ' + p.slice(2) : '') : p;
  }

  function renderKiosk() {
    if (!kioskBody) return;
    let html = '';
    switch (kioskState.screen) {
      case 'home': html = kioskScreens.home(); break;
      case 'input_plate': html = kioskScreens.input_plate(); break;
      case 'input_pin': html = kioskScreens.input_pin(); break;
      case 'assigned': html = kioskScreens.assigned(); break;
      case 'complete': html = kioskScreens.complete(kioskState.completeMsg); break;
      case 'error': html = kioskScreens.error(kioskState.errorMsg); break;
      default: html = kioskScreens.home();
    }
    kioskBody.innerHTML = html;
    bindKioskEvents();
  }

  function bindKioskEvents() {
    kioskBody.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', () => handleKioskAction(btn.getAttribute('data-action')));
    });
    const kp = document.getElementById('kiosk-keypad');
    if (kp) {
      kp.addEventListener('click', (e) => {
        const b = e.target.closest('.keypad-btn');
        if (!b) return;
        const key = b.getAttribute('data-key');
        if (kioskState.screen === 'input_pin') {
          if (key === 'del') kioskState.pin = kioskState.pin.slice(0, -1);
          else if (key === 'ok') submitPin();
          else if (kioskState.pin.length < 4) kioskState.pin += key;
        } else {
          if (key === 'del') kioskState.plate = kioskState.plate.slice(0, -1);
          else if (key === 'ok') submitPlate();
          else if (kioskState.plate.length < 8) kioskState.plate += key;
        }
        renderKiosk();
      });
    }
  }

  function handleKioskAction(action) {
    kioskState.plate = '';
    kioskState.pin = '';
    if (action === 'home') {
      kioskState = { screen: 'home', step: 0, plate: '', pin: '', assignedLocker: null };
    } else if (action === 'deposit') {
      kioskState = { screen: 'input_plate', step: 1, plate: '', pin: '', assignedLocker: null, flow: 'deposit' };
    } else if (action === 'pickup') {
      kioskState = { screen: 'input_plate', step: 1, plate: '', pin: '', assignedLocker: null, flow: 'pickup' };
    } else if (action === 'technician') {
      kioskState = { screen: 'input_plate', step: 1, plate: '', pin: '', assignedLocker: null, flow: 'technician' };
    }
    renderKiosk();
    if (autoplayEnabled && action !== 'home') scheduleAutoplay();
  }

  function submitPlate() {
    if (kioskState.plate.length < 4) return;
    const flow = kioskState.flow;

    if (flow === 'deposit') {
      const empty = findEmptyLocker();
      if (!empty) {
        kioskState = { screen: 'error', errorMsg: '빈 보관함이 없습니다.' };
        renderKiosk();
        return;
      }
      kioskState.assignedLocker = empty.id;
      setLockerStatus(empty.id, 'DOOR_OPEN', kioskState.plate, null);
      logEvent(`[맡기기] ${kioskState.plate} → 보관함 #${empty.id} 배정, 문 개방.`);
      kioskState.screen = 'assigned';
      kioskState.step = 3;
      renderKiosk();
      kioskTimeouts.push(setTimeout(() => {
        setLockerStatus(empty.id, 'RENTED', kioskState.plate, String(Math.floor(1000 + Math.random() * 9000)));
        kioskState.screen = 'complete';
        kioskState.completeMsg = '키 보관이 완료되었습니다';
        logEvent(`[맡기기] 보관함 #${empty.id} 문 닫힘 · 접수 완료.`);
        renderKiosk();
        if (autoplayEnabled) kioskTimeouts.push(setTimeout(resetKioskDemo, 3000));
      }, 3500));
    } else if (flow === 'pickup') {
      const locker = findLockerByPlate(kioskState.plate);
      if (!locker) {
        kioskState = { screen: 'error', errorMsg: '등록된 차량번호가 없습니다.' };
        renderKiosk();
        return;
      }
      kioskState.assignedLocker = locker.id;
      kioskState.screen = 'input_pin';
      kioskState.step = 2;
      renderKiosk();
    } else if (flow === 'technician') {
      const locker = findLockerByPlate(kioskState.plate) || lockers.find(l => l.plate === kioskState.plate);
      if (!locker) {
        kioskState = { screen: 'error', errorMsg: '해당 차량 키를 찾을 수 없습니다.' };
        renderKiosk();
        return;
      }
      setLockerStatus(locker.id, 'DOOR_OPEN');
      logEvent(`[정비사] ${kioskState.plate} → 보관함 #${locker.id} 개방.`);
      kioskState.screen = 'complete';
      kioskState.completeMsg = `보관함 #${locker.id} 개방됨`;
      renderKiosk();
    }
  }

  function submitPin() {
    const locker = lockers.find(l => l.id === kioskState.assignedLocker);
    if (!locker || locker.pin !== kioskState.pin) {
      kioskState = { screen: 'error', errorMsg: '비밀번호가 올바르지 않습니다.' };
      logEvent(`[찾기] PIN 검증 실패 (${kioskState.plate}).`);
      renderKiosk();
      return;
    }
    setLockerStatus(locker.id, 'DOOR_OPEN');
    logEvent(`[찾기] ${kioskState.plate} PIN 확인 → 보관함 #${locker.id} 개방.`);
    kioskState.screen = 'assigned';
    kioskState.step = 4;
    renderKiosk();
    kioskTimeouts.push(setTimeout(() => {
      setLockerStatus(locker.id, 'EMPTY', null, null);
      kioskState.screen = 'complete';
      kioskState.completeMsg = '키 수령이 완료되었습니다';
      logEvent(`[찾기] 보관함 #${locker.id} 키 수령 완료.`);
      renderKiosk();
      if (autoplayEnabled) kioskTimeouts.push(setTimeout(resetKioskDemo, 3000));
    }, 3500));
  }

  function resetKioskDemo() {
    kioskTimeouts.forEach(t => clearTimeout(t));
    kioskTimeouts = [];
    seedLockers();
    kioskState = { screen: 'home', step: 0, plate: '', pin: '', assignedLocker: null };
    renderKiosk();
    renderLockerGrid();
    logEvent('데모 상태가 초기화되었습니다.');
  }

  function scheduleAutoplay() {
    const scenario = document.getElementById('select-scenario').value;
    kioskTimeouts.push(setTimeout(() => {
      if (kioskState.screen === 'input_plate') {
        kioskState.plate = scenario === 'pickup' ? '12가3456' : '78라9999';
        submitPlate();
        if (scenario === 'pickup') {
          kioskTimeouts.push(setTimeout(() => {
            kioskState.pin = '4821';
            submitPin();
          }, 1500));
        }
      }
    }, 1200));
  }

  document.getElementById('btn-reset-demo').addEventListener('click', resetKioskDemo);
  document.getElementById('select-scenario').addEventListener('change', (e) => {
    resetKioskDemo();
    const v = e.target.value;
    if (v === 'deposit') handleKioskAction('deposit');
    else if (v === 'pickup') handleKioskAction('pickup');
    else handleKioskAction('technician');
    logEvent(`시나리오 변경: ${e.target.options[e.target.selectedIndex].text}`);
  });

  document.getElementById('checkbox-autoplay').addEventListener('change', (e) => {
    autoplayEnabled = e.target.checked;
    logEvent(`자동 재생: ${autoplayEnabled ? 'ON' : 'OFF'}`);
    if (autoplayEnabled) scheduleAutoplay();
  });

  // ==========================================
  // LOGGING & CLOCK
  // ==========================================
  function logEvent(msg) {
    if (!eventLogBox) return;
    const t = new Date();
    const ts = [t.getHours(), t.getMinutes(), t.getSeconds()].map(n => String(n).padStart(2, '0')).join(':');
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    entry.innerHTML = `<span class="log-time">[${ts}]</span> <span class="log-msg">${msg}</span>`;
    eventLogBox.appendChild(entry);
    while (eventLogBox.children.length > 50) eventLogBox.removeChild(eventLogBox.firstChild);
    eventLogBox.scrollTop = eventLogBox.scrollHeight;
  }

  function startClock() {
    function tick() {
      const t = new Date();
      if (screenClock) screenClock.textContent = [t.getHours(), t.getMinutes(), t.getSeconds()].map(n => String(n).padStart(2, '0')).join(':');
    }
    tick();
    clockInterval = setInterval(tick, 1000);
  }

  function stopClock() {
    if (clockInterval) clearInterval(clockInterval);
  }

  // Init
  updateSlideView();
  renderLockerGrid();

});
