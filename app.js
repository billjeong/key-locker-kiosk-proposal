document.addEventListener('DOMContentLoaded', () => {

  // ==========================================
  // STATE MANAGEMENT & CABIN LOCKERS SEEDING
  // ==========================================
  let currentSlide = 1;
  const totalSlides = 7;
  let activeMode = 'pitch'; // 'pitch' or 'dashboard'
  let isDialogueRunning = false;
  let dialogueTimeouts = [];
  let signageDialogueInterval = null;

  // 20-compartment key locker model inside simulation
  const TOTAL_LOCKERS = 20;
  const lockers = Array.from({ length: TOTAL_LOCKERS }, (_, i) => ({
    id: i + 1,
    status: 'AVAILABLE', // EMPTY, AVAILABLE, RENTED, DOOR_OPEN, DOOR_ERROR
    plate: null,
    pin: null
  }));

  // Initial seeding of lockers to look natural
  function seedCabinetLockers() {
    // Reset all to AVAILABLE
    for (let i = 0; i < TOTAL_LOCKERS; i++) {
      lockers[i] = { id: i + 1, status: 'AVAILABLE', plate: null, pin: null };
    }
    // Set some rented/empty for visual diversity
    lockers[1] = { id: 2, status: 'RENTED', plate: '34나7890', pin: '7392' };
    lockers[4] = { id: 5, status: 'EMPTY', plate: null, pin: null };
    lockers[7] = { id: 8, status: 'RENTED', plate: '56다1234', pin: '1289' };
    lockers[11] = { id: 12, status: 'EMPTY', plate: null, pin: null };
    lockers[14] = { id: 15, status: 'RENTED', plate: '78라5678', pin: '9901' };
    lockers[18] = { id: 19, status: 'AVAILABLE', plate: null, pin: null };
  }

  // Render 20-locker grid in the Right Screen Panel
  function renderCabinetLockerGrid() {
    const container = document.getElementById('locker-grid-cabinet');
    if (!container) return;
    container.innerHTML = lockers.map(l => {
      let statusClass = 'available';
      let statusText = '가용';
      if (l.status === 'EMPTY') { statusClass = 'empty'; statusText = '빈함'; }
      else if (l.status === 'RENTED') { statusClass = 'rented'; statusText = '보관'; }
      else if (l.status === 'DOOR_OPEN') { statusClass = 'door_open'; statusText = '열림'; }
      else if (l.status === 'DOOR_ERROR') { statusClass = 'door_error'; statusText = '오류'; }
      
      return `
        <div class="locker-cell-cabinet ${statusClass}" title="보관함 #${l.id} (${statusText})">
          <span class="cell-num">${l.id}</span>
          <span class="cell-status">${statusText}</span>
        </div>
      `;
    }).join('');
  }

  // ==========================================
  // DOM ELEMENTS
  // ==========================================
  const pitchContainer = document.getElementById('pitch-container');
  const dashboardContainer = document.getElementById('dashboard-container');
  const slideIndicator = document.getElementById('slide-indicator');
  const navControls = document.getElementById('slide-nav-controls');
  
  const btnPrev = document.getElementById('btn-prev');
  const btnNext = document.getElementById('btn-next');
  const btnModePitch = document.getElementById('btn-mode-pitch');
  const btnModeDashboard = document.getElementById('btn-mode-dashboard');
  
  const btnStartPitch = document.getElementById('btn-start-pitch');
  const btnJumpDb = document.getElementById('btn-jump-db');
  const btnConclusionDemo = document.getElementById('btn-conclusion-demo');

  // ==========================================
  // SLIDE NAVIGATION LOGIC
  // ==========================================
  function updateSlideView() {
    for (let i = 1; i <= totalSlides; i++) {
      const slide = document.getElementById(`slide-${i}`);
      if (slide) {
        if (i === currentSlide) {
          slide.classList.add('active');
        } else {
          slide.classList.remove('active');
        }
      }
    }
    
    if (slideIndicator) slideIndicator.textContent = `${currentSlide} / ${totalSlides}`;
    if (btnPrev) btnPrev.disabled = currentSlide === 1;
    if (btnNext) btnNext.disabled = currentSlide === totalSlides;
  }

  function nextSlide() {
    if (currentSlide < totalSlides) {
      currentSlide++;
      updateSlideView();
    }
  }

  function prevSlide() {
    if (currentSlide > 1) {
      currentSlide--;
      updateSlideView();
    }
  }

  if (btnNext) btnNext.addEventListener('click', nextSlide);
  if (btnPrev) btnPrev.addEventListener('click', prevSlide);

  // Keyboard navigation
  document.addEventListener('keydown', (e) => {
    if (activeMode === 'pitch') {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        nextSlide();
      } else if (e.key === 'ArrowLeft') {
        prevSlide();
      }
    }
  });

  // Slide Actions
  if (btnStartPitch) btnStartPitch.addEventListener('click', nextSlide);
  if (btnJumpDb) btnJumpDb.addEventListener('click', () => switchMode('dashboard'));
  if (btnConclusionDemo) btnConclusionDemo.addEventListener('click', () => switchMode('dashboard'));

  // ==========================================
  // MODE TOGGLE (PITCH VS DASHBOARD)
  // ==========================================
  function switchMode(mode) {
    activeMode = mode;
    if (mode === 'pitch') {
      if (btnModePitch) btnModePitch.classList.add('active');
      if (btnModeDashboard) btnModeDashboard.classList.remove('active');
      if (pitchContainer) pitchContainer.style.display = 'flex';
      if (dashboardContainer) dashboardContainer.classList.remove('active');
      if (navControls) navControls.style.display = 'flex';
      updateSlideView();
      stopSignageDemoSim();
    } else {
      if (btnModePitch) btnModePitch.classList.remove('active');
      if (btnModeDashboard) btnModeDashboard.classList.add('active');
      if (pitchContainer) pitchContainer.style.display = 'none';
      if (dashboardContainer) dashboardContainer.classList.add('active');
      if (navControls) navControls.style.display = 'none';
      startSignageDemoSim();
    }
  }

  if (btnModePitch) btnModePitch.addEventListener('click', () => switchMode('pitch'));
  if (btnModeDashboard) btnModeDashboard.addEventListener('click', () => switchMode('dashboard'));

  // ==========================================
  // SLIDE 2: VEHICLE TRAFFIC CONGESTION SLIDER
  // ==========================================
  const statsSlider = document.getElementById('stats-slider');
  const sliderYearText = document.getElementById('slider-year-text');
  const valPatients = document.getElementById('val-patients');
  const valClinicRatio = document.getElementById('val-clinic-ratio');
  const valRiskIndex = document.getElementById('val-risk-index');
  
  const cardPatients = document.getElementById('card-patients');
  const cardClinicRatio = document.getElementById('card-clinic-ratio');
  const cardRiskIndex = document.getElementById('card-risk-index');

  function updateStatsMetrics(level) {
    let waitTime = '8분';
    let lossRatio = '0.12%';
    let riskLabel = '보통 (중)';
    let statusText = `오후 (보통)`;
    
    if (level <= 1) {
      statusText = `오전 (한산)`;
      waitTime = '3분';
      lossRatio = '0.02%';
      riskLabel = '안정 (하)';
    } else if (level == 2) {
      statusText = `오후 (보통)`;
      waitTime = '8분';
      lossRatio = '0.12%';
      riskLabel = '주의 (중)';
    } else {
      statusText = `퇴근 (피크)`;
      waitTime = '18분';
      lossRatio = '0.35%';
      riskLabel = '혼잡 (상)';
    }

    if (sliderYearText) sliderYearText.textContent = statusText;
    if (valPatients) valPatients.textContent = waitTime;
    if (valClinicRatio) valClinicRatio.textContent = lossRatio;
    if (valRiskIndex) valRiskIndex.textContent = riskLabel;

    // Apply color styling based on level
    if (riskLabel === '안정 (하)') {
      if (valRiskIndex) valRiskIndex.className = 'metric-value teal';
      if (cardRiskIndex) cardRiskIndex.className = 'metric-card';
    } else if (riskLabel === '주의 (중)') {
      if (valRiskIndex) valRiskIndex.className = 'metric-value teal';
      if (cardRiskIndex) cardRiskIndex.className = 'metric-card';
    } else {
      if (valRiskIndex) valRiskIndex.className = 'metric-value cyan';
      if (cardRiskIndex) cardRiskIndex.className = 'metric-card alert-active';
    }
  }

  if (statsSlider) {
    statsSlider.addEventListener('input', (e) => {
      updateStatsMetrics(parseInt(e.target.value));
    });
  }

  // Init Slide 2
  updateStatsMetrics(2);

  // ==========================================
  // SLIDE 3: SVG FLOW DIAGRAM ARCHITECTURE
  // ==========================================
  const nodeItems = document.querySelectorAll('.node-item');
  
  function triggerDiagramFlow(nodeName) {
    // Hide all flow paths
    const flow1 = document.getElementById('flow-mic-denoise');
    const flow2 = document.getElementById('flow-denoise-translate');
    const flow3 = document.getElementById('flow-translate-ui');
    if (flow1) flow1.style.display = 'none';
    if (flow2) flow2.style.display = 'none';
    if (flow3) flow3.style.display = 'none';
    
    // Reset SVG node glow styling
    document.querySelectorAll('.svg-node').forEach(node => {
      const rect = node.querySelector('rect');
      if (rect) {
        rect.setAttribute('stroke', 'var(--border-color)');
        rect.setAttribute('filter', 'none');
      }
    });

    if (nodeName === 'mic') {
      const nodeEl = document.getElementById('svg-node-mic');
      if (nodeEl && nodeEl.querySelector('rect')) {
        nodeEl.querySelector('rect').setAttribute('stroke', 'var(--accent-fuchsia)');
        nodeEl.querySelector('rect').setAttribute('filter', 'url(#glow-fuchsia)');
      }
    } else if (nodeName === 'denoise') {
      if (flow1) flow1.style.display = 'block';
      const nodeEl = document.getElementById('svg-node-denoise');
      if (nodeEl && nodeEl.querySelector('rect')) {
        nodeEl.querySelector('rect').setAttribute('stroke', 'var(--primary-purple)');
        nodeEl.querySelector('rect').setAttribute('filter', 'url(#glow-purple)');
      }
    } else if (nodeName === 'translate') {
      if (flow1) flow1.style.display = 'block';
      if (flow2) flow2.style.display = 'block';
      const nodeEl = document.getElementById('svg-node-translate');
      if (nodeEl && nodeEl.querySelector('rect')) {
        nodeEl.querySelector('rect').setAttribute('stroke', 'var(--accent-fuchsia)');
        nodeEl.querySelector('rect').setAttribute('filter', 'url(#glow-fuchsia)');
      }
    } else if (nodeName === 'ui') {
      if (flow1) flow1.style.display = 'block';
      if (flow2) flow2.style.display = 'block';
      if (flow3) flow3.style.display = 'block';
      const nodeEl = document.getElementById('svg-node-ui');
      if (nodeEl && nodeEl.querySelector('rect')) {
        nodeEl.querySelector('rect').setAttribute('stroke', 'var(--primary-purple)');
        nodeEl.querySelector('rect').setAttribute('filter', 'url(#glow-purple)');
      }
    }
  }

  nodeItems.forEach(item => {
    item.addEventListener('click', () => {
      nodeItems.forEach(n => n.classList.remove('selected'));
      item.classList.add('selected');
      const nodeName = item.getAttribute('data-node');
      triggerDiagramFlow(nodeName);
    });
  });

  // Bind SVG node click events safely
  const svgNodeMic = document.getElementById('svg-node-mic');
  if (svgNodeMic) {
    svgNodeMic.addEventListener('click', () => {
      const target = document.querySelector('[data-node="mic"]');
      if (target) target.click();
    });
  }
  const svgNodeDenoise = document.getElementById('svg-node-denoise');
  if (svgNodeDenoise) {
    svgNodeDenoise.addEventListener('click', () => {
      const target = document.querySelector('[data-node="denoise"]');
      if (target) target.click();
    });
  }
  const svgNodeTranslate = document.getElementById('svg-node-translate');
  if (svgNodeTranslate) {
    svgNodeTranslate.addEventListener('click', () => {
      const target = document.querySelector('[data-node="translate"]');
      if (target) target.click();
    });
  }
  const svgNodeUi = document.getElementById('svg-node-ui');
  if (svgNodeUi) {
    svgNodeUi.addEventListener('click', () => {
      const target = document.querySelector('[data-node="ui"]');
      if (target) target.click();
    });
  }

  // Init Slide 3 diagram state
  triggerDiagramFlow('mic');

  // ==========================================
  // SLIDE 4: SIDE-BY-SIDE DIALOGUE SIMULATION
  // ==========================================
  const dialoguePresets = {
    en: {
      lang: "DEPOSIT FLOW",
      patientText: "차량번호 '12가 3456'을 화면 키패드에 입력합니다. [확인] 선택.",
      patientTrans: "차량번호 입력 수신 완료 → 가용 보관함 배정 로직 가동.",
      staffText: "#3번 보관함이 자동으로 배정되고 전자락 해제 및 열림 신호가 감지됩니다.",
      staffTrans: "보관함 #3번 개방 완료 (DOOR_OPEN). 키를 넣고 문을 닫아 주세요."
    },
    ja: {
      lang: "PICK UP FLOW",
      patientText: "차량번호 '12가 3456' 및 문자 수령 PIN '4821'을 입력합니다.",
      patientTrans: "PIN 패스워드 인증 요청 수신 → 클라우드 보안 토큰 검증 성공.",
      staffText: "#3번 보관함 잠금 해제. 고객이 차량 키를 수령한 후 도어를 닫아 접수를 마칩니다.",
      staffTrans: "보관함 #3번 개방 완료 → 도어 폐쇄 완료 → 상태: EMPTY (회색)"
    },
    zh: {
      lang: "TECHNICIAN FLOW",
      patientText: "정비사 전용 권한 키 '7777' 입력 및 검색 차량번호 '12가 3456' 지정.",
      patientTrans: "정비사 작업 권한 인증 완료 → 수령 보관함 원격 조회 실행.",
      staffText: "차량 키 보관 부서 권한으로 보관함 #3을 강제 개방하여 정비 작업을 개시합니다.",
      staffTrans: "보관함 #3번 정비 목적 개방 완료 → 정비사 작업 교대 로그 수집."
    }
  };

  let selectedPreset = 'en';

  const btnPresetEn = document.getElementById('btn-preset-en');
  const btnPresetJa = document.getElementById('btn-preset-ja');
  const btnPresetZh = document.getElementById('btn-preset-zh');
  const btnRunDialogue = document.getElementById('btn-run-dialogue');
  
  const panelPatient = document.getElementById('panel-patient');
  const panelStaff = document.getElementById('panel-staff');
  const labelPatientLang = document.getElementById('label-patient-lang');
  
  const textPatient = document.getElementById('text-patient');
  const transPatient = document.getElementById('trans-patient');
  const textStaff = document.getElementById('text-staff');
  const transStaff = document.getElementById('trans-staff');
  
  const cursorPatient = document.getElementById('cursor-patient');
  const cursorStaff = document.getElementById('cursor-staff');

  function setPreset(presetName) {
    if (isDialogueRunning) return;
    selectedPreset = presetName;
    const p = dialoguePresets[presetName];
    
    if (btnPresetEn) btnPresetEn.classList.remove('active');
    if (btnPresetJa) btnPresetJa.classList.remove('active');
    if (btnPresetZh) btnPresetZh.classList.remove('active');
    
    const targetBtn = document.getElementById(`btn-preset-${presetName}`);
    if (targetBtn) targetBtn.classList.add('active');

    if (labelPatientLang) labelPatientLang.textContent = p.lang;
    if (textPatient) textPatient.textContent = p.patientText;
    if (transPatient) transPatient.textContent = p.patientTrans;
    if (textStaff) textStaff.textContent = p.staffText;
    if (transStaff) transStaff.textContent = p.staffTrans;
    
    if (textPatient && cursorPatient) textPatient.appendChild(cursorPatient);
    if (textStaff && cursorStaff) textStaff.appendChild(cursorStaff);
    
    if (panelPatient) panelPatient.className = "lang-panel active-turn";
    if (panelStaff) panelStaff.className = "lang-panel dimmed-turn";
    if (cursorPatient) cursorPatient.style.display = 'inline-block';
    if (cursorStaff) cursorStaff.style.display = 'none';
  }

  if (btnPresetEn) btnPresetEn.addEventListener('click', () => setPreset('en'));
  if (btnPresetJa) btnPresetJa.addEventListener('click', () => setPreset('ja'));
  if (btnPresetZh) btnPresetZh.addEventListener('click', () => setPreset('zh'));

  function typeText(element, cursor, fullText, translationElement, translationText, speed = 50, callback) {
    if (!element) return;
    element.innerHTML = '';
    if (translationElement) {
      translationElement.style.opacity = 0;
      translationElement.style.transition = 'opacity 0.5s ease';
    }
    
    let index = 0;
    if (cursor) {
      cursor.style.display = 'inline-block';
      element.appendChild(cursor);
    }
    
    const parentContainer = element.closest('.scrollable-messages');
    
    const interval = setInterval(() => {
      if (index < fullText.length) {
        if (cursor) {
          element.insertBefore(document.createTextNode(fullText.charAt(index)), cursor);
        } else {
          element.appendChild(document.createTextNode(fullText.charAt(index)));
        }
        index++;
        if (parentContainer) {
          parentContainer.scrollTop = parentContainer.scrollHeight;
        }
      } else {
        clearInterval(interval);
        if (cursor) cursor.style.display = 'none';
        if (translationElement) {
          translationElement.textContent = translationText;
          translationElement.style.opacity = 1;
        }
        if (parentContainer) {
          parentContainer.scrollTop = parentContainer.scrollHeight;
        }
        if (callback) callback();
      }
    }, speed);
    
    dialogueTimeouts.push(interval);
  }

  function startDialogueSimulation() {
    if (isDialogueRunning) return;
    isDialogueRunning = true;
    if (btnRunDialogue) {
      btnRunDialogue.disabled = true;
      btnRunDialogue.textContent = "진행 중...";
    }
    
    const p = dialoguePresets[selectedPreset];

    dialogueTimeouts.forEach(id => clearInterval(id));
    dialogueTimeouts = [];

    if (panelPatient) panelPatient.className = "lang-panel active-turn";
    if (panelStaff) panelStaff.className = "lang-panel dimmed-turn";
    
    typeText(textPatient, cursorPatient, p.patientText, transPatient, p.patientTrans, 40, () => {
      const t1 = setTimeout(() => {
        if (panelPatient) panelPatient.className = "lang-panel dimmed-turn";
        if (panelStaff) panelStaff.className = "lang-panel active-turn";
        
        typeText(textStaff, cursorStaff, p.staffText, transStaff, p.staffTrans, 40, () => {
          const t2 = setTimeout(() => {
            isDialogueRunning = false;
            if (btnRunDialogue) {
              btnRunDialogue.disabled = false;
              btnRunDialogue.textContent = "시뮬레이션 가동";
            }
          }, 1500);
          dialogueTimeouts.push(t2);
        });
      }, 1200);
      dialogueTimeouts.push(t1);
    });
  }

  if (btnRunDialogue) btnRunDialogue.addEventListener('click', startDialogueSimulation);

  // ==========================================
  // SLIDE 5: NOISE FILTER SLIDER (Severity)
  // ==========================================
  const noiseSlider = document.getElementById('noise-slider');
  const labelNoiseDb = document.getElementById('label-noise-db');
  const cardRawStt = document.getElementById('card-raw-stt');
  const cardCleanedStt = document.getElementById('card-cleaned-stt');
  const textRawStt = document.getElementById('text-raw-stt');
  const textCleanedStt = document.getElementById('text-cleaned-stt');

  function updateNoiseSim(db) {
    let noiseLabel = '75 dB (원무 도로변 야외 소음)';
    let rawText = '';
    let cleanText = '';
    
    if (db <= 45) {
      noiseLabel = `${db} dB (안정적인 실내 대기)`;
      rawText = `"터치 감도 안정적 및 도어 락 제어 정상 동작 (지연 없음)"`;
      cleanText = `"IP65 방수방진, 스마트 팬 및 <strong>도어 스캔 알고리즘</strong>으로 안정 운영 유지"`;
      if (cardRawStt) cardRawStt.className = 'comp-card raw';
      if (cardCleanedStt) cardCleanedStt.className = 'comp-card cleaned success-active';
    } else if (db > 45 && db <= 75) {
      noiseLabel = `${db} dB (원무 도로변 야외 소음)`;
      rawText = `"직사광선에 의한 터치 감도 저하 및 도어 잠금 지연 <s>에러 발생</s>"`;
      cleanText = `"IP65 방수방진, 스마트 팬 및 <strong>도어 스캔 알고리즘</strong>으로 안정 운영 유지"`;
      if (cardRawStt) cardRawStt.className = 'comp-card raw noise-active';
      if (cardCleanedStt) cardCleanedStt.className = 'comp-card cleaned success-active';
    } else {
      noiseLabel = `${db} dB (극한 혹서기/소음 환경)`;
      rawText = `"태블릿 기기 발열로 인한 <s>시스템 정지</s> 및 <s>잠금 보드 제어 불능</s>"`;
      cleanText = `"극한 가혹 조건 진입: 강제 쿨링 팬 기동 및 <strong>이중 센서 오차 자동 보정</strong> 가동 (무중단)"`;
      if (cardRawStt) cardRawStt.className = 'comp-card raw noise-active';
      if (cardCleanedStt) cardCleanedStt.className = 'comp-card cleaned success-active';
    }

    if (labelNoiseDb) labelNoiseDb.textContent = noiseLabel;
    if (textRawStt) textRawStt.innerHTML = rawText;
    if (textCleanedStt) textCleanedStt.innerHTML = cleanText;
  }

  if (noiseSlider) {
    noiseSlider.addEventListener('input', (e) => {
      updateNoiseSim(parseInt(e.target.value));
    });
  }

  // Init Slide 5
  updateNoiseSim(75);

  // ==========================================
  // SLIDE 6: ROADMAP INTERACTIVE CHECKLIST
  // ==========================================
  const roadmapPhases = document.querySelectorAll('.roadmap-phase');
  const roadmapProgressText = document.getElementById('roadmap-progress-text');
  const roadmapProgressFill = document.getElementById('roadmap-progress-fill');

  roadmapPhases.forEach(phase => {
    phase.addEventListener('click', (e) => {
      if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'LABEL') {
        roadmapPhases.forEach(p => p.classList.remove('active'));
        phase.classList.add('active');
      }
    });
  });

  const roadmapTasks = [
    document.getElementById('task-poc-3'),
    document.getElementById('task-poc-4'),
    document.getElementById('task-main-1'),
    document.getElementById('task-main-2'),
    document.getElementById('task-main-3'),
    document.getElementById('task-main-4'),
    document.getElementById('task-ext-1'),
    document.getElementById('task-ext-2')
  ];

  function updateRoadmapProgress() {
    let completedCount = 2; // base UI check items
    const totalCount = 10;
    
    roadmapTasks.forEach(task => {
      if (task && task.checked) completedCount++;
    });
    
    const percentage = Math.round((completedCount / totalCount) * 100);
    if (roadmapProgressText) roadmapProgressText.textContent = `${percentage}%`;
    if (roadmapProgressFill) roadmapProgressFill.style.width = `${percentage}%`;
  }

  roadmapTasks.forEach(task => {
    if (task) {
      task.addEventListener('change', updateRoadmapProgress);
    }
  });

  // Init Slide 6
  updateRoadmapProgress();

  // ==========================================
  // LIVE SIGNAGE SIMULATOR DEMO LOGIC
  // ==========================================
  const btnDeviceLandscape = document.getElementById('btn-device-landscape');
  const btnDevicePortrait = document.getElementById('btn-device-portrait');
  const deviceFrame = document.getElementById('device-frame');
  const selectScenario = document.getElementById('select-scenario');
  const btnResetDemo = document.getElementById('btn-reset-demo');
  const screenClock = document.getElementById('screen-clock');

  // KeyLocker Scenario database
  const signageScenarios = {
    reception: {
      flag: "📟",
      langName: "KIOSK SCREEN",
      turns: [
        {
          speaker: 'patient',
          text: "차량 키 보관을 시작합니다. 차량번호 4자리를 입력해 주세요.",
          trans: "[System] Ready. Waiting for touch keypad input."
        },
        {
          speaker: 'patient',
          text: "차량번호 [1234] 입력 완료. [확인] 터치.",
          trans: "[System] Keypad input received. Requesting empty locker allocation."
        },
        {
          speaker: 'staff',
          text: "가용 보관함 검색 완료: 보관함 #3번 자동 지정 및 원격 잠금 장치 해제.",
          trans: "[Sensor] Locker #3 door lock relay activated. State: DOOR_OPEN (빨강)."
        },
        {
          speaker: 'patient',
          text: "#3번 보관함이 열렸습니다. 차량 키를 투입하고 문을 완전히 닫아 주세요.",
          trans: "[System] Waiting for locker door closure sensor signal."
        },
        {
          speaker: 'staff',
          text: "보관함 #3번 도어 닫힘 및 잠금 장치 체결 감지 완료.",
          trans: "[Sensor] Locker #3 door closed. State: RENTED (주황)."
        },
        {
          speaker: 'patient',
          text: "키 보관이 성공적으로 완료되었습니다. 수령용 SMS 비밀번호는 [4821] 입니다.",
          trans: "[System] Safe deposit complete. SMS notification dispatched."
        }
      ]
    },
    treatment: {
      flag: "📟",
      langName: "KIOSK SCREEN",
      turns: [
        {
          speaker: 'patient',
          text: "차량 키 수령을 시작합니다. 차량번호 4자리를 입력해 주세요.",
          trans: "[System] Ready. Waiting for vehicle plate search."
        },
        {
          speaker: 'patient',
          text: "차량번호 [1234] 입력 완료. 비밀번호 입력 단계로 이동.",
          trans: "[System] Vehicle found in Locker #3. Verification code required."
        },
        {
          speaker: 'patient',
          text: "수령 문자 비밀번호 PIN [4821] 입력 완료. [확인] 터치.",
          trans: "[System] Security token verification matches. Unlocking drawer."
        },
        {
          speaker: 'staff',
          text: "보관함 #3번 원격 전자락 잠금 해제 신호 송출 및 도어 열림 감지.",
          trans: "[Sensor] Locker #3 door sensor: OPEN. State: DOOR_OPEN (빨강)."
        },
        {
          speaker: 'staff',
          text: "차량 키 수령 확인 및 보관함 #3번 완전 닫힘 감지.",
          trans: "[Sensor] Locker #3 door sensor: CLOSED. State: EMPTY (회색)."
        },
        {
          speaker: 'patient',
          text: "차량 키 인도가 무사히 끝났습니다. 이용해 주셔서 감사합니다.",
          trans: "[System] Safe pick up complete. Transaction archived."
        }
      ]
    },
    pharmacy: {
      flag: "📟",
      langName: "KIOSK SCREEN",
      turns: [
        {
          speaker: 'patient',
          text: "정비사 전용 권한 키 '7777' 입력 및 인증 통과.",
          trans: "[System] Staff authentication success. Pulling list of cars."
        },
        {
          speaker: 'patient',
          text: "정비 대상 차량 [1234] 선택 및 보관함 #3번 열림 명령 인가.",
          trans: "[System] Sending RS485 unlock packet to Board #1."
        },
        {
          speaker: 'staff',
          text: "보관함 #3번 잠금 해제 및 정비사 수령 완료.",
          trans: "[Sensor] Locker #3 door opened by Staff. State: DOOR_OPEN (빨강)."
        },
        {
          speaker: 'staff',
          text: "작업 완료 후 차량 키 보관함 #3번에 재투입 및 도어 폐쇄.",
          trans: "[Sensor] Locker #3 door closed and locked. State: RENTED (주황)."
        },
        {
          speaker: 'patient',
          text: "정비사 키 보관 이력 갱신 완료 및 고객 수령 비밀번호 신규 생성.",
          trans: "[System] Database updated. Ready for customer retrieval."
        }
      ]
    },
    fault: {
      flag: "📟",
      langName: "KIOSK SCREEN",
      turns: [
        {
          speaker: 'patient',
          text: "차량 키 보관을 시작합니다. 차량번호 4자리를 입력해 주세요.",
          trans: "[System] Ready."
        },
        {
          speaker: 'patient',
          text: "차량번호 [9999] 입력 완료. 가용 보관함 #12번 배정.",
          trans: "[System] Locker #12 allocated. Triggering door unlock relay."
        },
        {
          speaker: 'staff',
          text: "보관함 #12번 잠금 해제 및 개방 신호 수집 완료.",
          trans: "[Sensor] Locker #12 door sensor: OPEN. State: DOOR_OPEN (빨강)."
        },
        {
          speaker: 'staff',
          text: "경고: 보관함 #12번 도어 열림 대기 시간 60초 초과 감지.",
          trans: "[Sensor] Warning: Door open timeout. Checking magnetic state."
        },
        {
          speaker: 'staff',
          text: "비상 알림: 보관함 #12번 도어가 닫히지 않았습니다! (미닫힘 장애)",
          trans: "[Sensor] Critical Alert! State: DOOR_ERROR (빨강 점멸)."
        },
        {
          speaker: 'patient',
          text: "경고! 보관함 문이 닫히지 않았습니다. 안전을 위해 즉시 닫아 주세요.",
          trans: "[System] Error screen active. Remote administrator notified."
        }
      ]
    }
  };

  let currentScenario = 'reception';
  let deviceOrientation = 'landscape';
  let isSignageSimRunning = false;
  let signageTimeouts = [];
  let clockIntervalId = null;
  let audioStreamIntervalId = null;
  let logIntervalId = null;

  // Autoplay config
  const checkboxAutoplay = document.getElementById('checkbox-autoplay');
  const btnNextTurn = document.getElementById('btn-next-turn');
  const patientMessagesContainer = document.getElementById('patient-messages-container');
  const staffMessagesContainer = document.getElementById('staff-messages-container');
  const eventLogBox = document.getElementById('event-log-box');

  let currentTurnIndex = 0;
  let autoplayEnabled = true;

  // Signal Wave Canvas config
  const canvasLiveAudio = document.getElementById('canvas-live-audio');
  let ctxLiveAudio = null;
  if (canvasLiveAudio) {
    ctxLiveAudio = canvasLiveAudio.getContext('2d');
  }
  let waveAmplitude = 1.5; // Normal quiet wave
  let wavePhase = 0;

  function startSignageDemoSim() {
    stopSignageDemoSim();

    // Init canvas size
    if (canvasLiveAudio) {
      canvasLiveAudio.width = 140;
      canvasLiveAudio.height = 32;
    }

    // 1. Run real-time clock inside screen
    updateScreenClock();
    clockIntervalId = setInterval(updateScreenClock, 1000);

    // 2. Run Sine Audio Wave drawing loop (60fps)
    if (ctxLiveAudio) {
      audioStreamIntervalId = setInterval(drawLiveAudioWave, 30);
    }

    // 3. Random background logs
    logIntervalId = setInterval(triggerRandomSignageLog, 4500);

    // 4. Seed and render lockers inside the cabinet screen
    seedCabinetLockers();
    renderCabinetLockerGrid();

    // 5. Start dialogue loop
    resetSignageDialogue();

    logSystemEvent("KeyLocker simulator activated. Network connection initialized.");
  }

  function stopSignageDemoSim() {
    if (clockIntervalId) clearInterval(clockIntervalId);
    if (audioStreamIntervalId) clearInterval(audioStreamIntervalId);
    if (logIntervalId) clearInterval(logIntervalId);
    
    signageTimeouts.forEach(t => clearTimeout(t));
    signageTimeouts = [];
    isSignageSimRunning = false;
  }

  // Device orientation toggles
  if (btnDeviceLandscape) {
    btnDeviceLandscape.addEventListener('click', () => {
      if (deviceOrientation === 'landscape') return;
      deviceOrientation = 'landscape';
      btnDeviceLandscape.classList.add('active');
      if (btnDevicePortrait) btnDevicePortrait.classList.remove('active');
      
      if (deviceFrame) deviceFrame.className = 'device-frame landscape-mode';
      logSystemEvent("Kiosk orientation changed to LANDSCAPE (16:9).");
      resetSignageDialogue();
    });
  }

  if (btnDevicePortrait) {
    btnDevicePortrait.addEventListener('click', () => {
      if (deviceOrientation === 'portrait') return;
      deviceOrientation = 'portrait';
      btnDevicePortrait.classList.add('active');
      if (btnDeviceLandscape) btnDeviceLandscape.classList.remove('active');
      
      if (deviceFrame) deviceFrame.className = 'device-frame portrait-mode';
      logSystemEvent("Kiosk orientation changed to PORTRAIT (9:16).");
      resetSignageDialogue();
    });
  }

  // Scenario Dropdown event
  if (selectScenario) {
    selectScenario.addEventListener('change', (e) => {
      currentScenario = e.target.value;
      logSystemEvent(`Scenario context switched to [${currentScenario.toUpperCase()}].`);
      resetSignageDialogue();
    });
  }

  if (btnResetDemo) {
    btnResetDemo.addEventListener('click', () => {
      logSystemEvent("Manual hardware reset dispatched.");
      resetSignageDialogue();
    });
  }

  // Autoplay toggle handler
  if (checkboxAutoplay) {
    checkboxAutoplay.addEventListener('change', (e) => {
      autoplayEnabled = e.target.checked;
      logSystemEvent(`Autoplay mode changed: ${autoplayEnabled ? 'ON' : 'OFF'}`);
      
      if (autoplayEnabled) {
        if (btnNextTurn) btnNextTurn.style.display = 'none';
        if (!isSignageSimRunning) {
          runSignageTurn();
        }
      } else {
        if (btnNextTurn) {
          btnNextTurn.style.display = 'inline-block';
          const scenario = signageScenarios[currentScenario];
          if (currentTurnIndex >= scenario.turns.length) {
            btnNextTurn.textContent = "완료";
            btnNextTurn.disabled = true;
          } else {
            btnNextTurn.textContent = currentTurnIndex === 0 ? "대화 시작 ⏭️" : "다음 단계 ⏭️";
            btnNextTurn.disabled = false;
          }
        }
      }
    });
  }

  // Next Turn button handler
  if (btnNextTurn) {
    btnNextTurn.addEventListener('click', () => {
      if (isSignageSimRunning) return;
      
      const scenario = signageScenarios[currentScenario];
      if (currentTurnIndex >= scenario.turns.length) {
        return;
      }
      
      btnNextTurn.disabled = true;
      btnNextTurn.textContent = "진행 중...";
      runSignageTurn();
    });
  }

  // Real-time clock update helper
  function updateScreenClock() {
    const time = new Date();
    const hh = String(time.getHours()).padStart(2, '0');
    const mm = String(time.getMinutes()).padStart(2, '0');
    const ss = String(time.getSeconds()).padStart(2, '0');
    if (screenClock) screenClock.textContent = `${hh}:${mm}:${ss}`;
  }

  // Draw smooth animated sine wave in the footer of signage screen
  function drawLiveAudioWave() {
    if (!ctxLiveAudio) return; // guard: canvas absent on non-dashboard pages
    ctxLiveAudio.fillStyle = '#08050e';
    ctxLiveAudio.fillRect(0, 0, 140, 32);
    
    ctxLiveAudio.strokeStyle = '#8b5cf6';
    ctxLiveAudio.lineWidth = 1.5;
    ctxLiveAudio.beginPath();
    
    wavePhase += 0.22; // Wave propagation speed
    
    for (let x = 0; x < 140; x++) {
      const angle = (x / 140) * Math.PI * 4 + wavePhase;
      const boundaryFade = Math.sin((x / 140) * Math.PI);
      const y = 16 + Math.sin(angle) * waveAmplitude * boundaryFade;
      
      if (x === 0) {
        ctxLiveAudio.moveTo(x, y);
      } else {
        ctxLiveAudio.lineTo(x, y);
      }
    }
    
    ctxLiveAudio.stroke();
  }

  // Helper to append a chat bubble to the panel body
  function appendMessageBubble(container, text, trans) {
    if (!container) return null;

    container.querySelectorAll('.chat-bubble').forEach(b => b.classList.remove('active-bubble'));

    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble active-bubble';

    const textEl = document.createElement('p');
    textEl.className = 'bubble-text';

    const transEl = document.createElement('p');
    transEl.className = 'bubble-trans';
    transEl.style.opacity = 0; // Starts hidden

    const cursor = document.createElement('span');
    cursor.className = 'typing-cursor';

    bubble.appendChild(textEl);
    bubble.appendChild(transEl);
    container.appendChild(bubble);

    // Scroll container down
    container.scrollTop = container.scrollHeight;

    return { textEl, transEl, cursor };
  }

  // Runs full dialogue loop matching the current scenario
  function resetSignageDialogue() {
    signageTimeouts.forEach(t => clearTimeout(t));
    signageTimeouts = [];
    isSignageSimRunning = false;

    dialogueTimeouts.forEach(id => clearInterval(id));
    dialogueTimeouts = [];

    // Reset scenario indices
    currentTurnIndex = 0;

    // Dom mapping elements
    const sPanelPatient = document.getElementById('screen-panel-patient');
    const sPanelStaff = document.getElementById('screen-panel-staff');
    const flagPatient = document.getElementById('flag-patient');
    const labelPatientLangName = document.getElementById('label-patient-lang-name');
    const liveMicBtn = document.getElementById('btn-live-mic');

    // Clear message bodies
    if (patientMessagesContainer) patientMessagesContainer.innerHTML = '';
    
    // Reset seed lockers & render
    seedCabinetLockers();
    renderCabinetLockerGrid();

    // Retrieve active scenario
    const s = signageScenarios[currentScenario];

    // Reset initial UI states
    if (flagPatient) flagPatient.textContent = s.flag;
    if (labelPatientLangName) labelPatientLangName.textContent = s.langName;
    
    if (sPanelPatient) sPanelPatient.className = "screen-panel patient-side active-turn";
    if (sPanelStaff) sPanelStaff.className = "screen-panel staff-side dimmed-turn";
    
    if (liveMicBtn) liveMicBtn.classList.remove('active');
    waveAmplitude = 1.5; // Flat quiet line

    // Reset Next Turn button
    if (btnNextTurn) {
      btnNextTurn.disabled = false;
      btnNextTurn.textContent = "시작 ⏭️";
      btnNextTurn.style.display = autoplayEnabled ? 'none' : 'inline-block';
    }

    // Start simulation after 800ms if Autoplay is enabled
    if (autoplayEnabled) {
      const startupTimeout = setTimeout(runSignageTurn, 800);
      signageTimeouts.push(startupTimeout);
    }
  }

  function runSignageTurn() {
    isSignageSimRunning = true;
    const scenario = signageScenarios[currentScenario];

    if (currentTurnIndex >= scenario.turns.length) {
      // Scenario finished
      if (autoplayEnabled) {
        logSystemEvent("Simulation scenario completed. Restarting in 5 seconds...");
        const t = setTimeout(() => {
          resetSignageDialogue();
        }, 5000);
        signageTimeouts.push(t);
      } else {
        isSignageSimRunning = false;
        if (btnNextTurn) {
          btnNextTurn.disabled = true;
          btnNextTurn.textContent = "대화 완료";
        }
        logSystemEvent("Simulation scenario completed.");
      }
      return;
    }

    const turn = scenario.turns[currentTurnIndex];
    const speaker = turn.speaker;

    const sPanelPatient = document.getElementById('screen-panel-patient');
    const sPanelStaff = document.getElementById('screen-panel-staff');
    const liveMicBtn = document.getElementById('btn-live-mic');

    // 1. Focus on speaker panel
    if (speaker === 'patient') {
      if (sPanelPatient) sPanelPatient.className = "screen-panel patient-side active-turn";
      if (sPanelStaff) sPanelStaff.className = "screen-panel staff-side dimmed-turn";
      logSystemEvent(`[API] Kiosk touch input step. Waiting for user action...`);
    } else {
      if (sPanelPatient) sPanelPatient.className = "screen-panel patient-side dimmed-turn";
      if (sPanelStaff) sPanelStaff.className = "screen-panel staff-side active-turn";
      logSystemEvent(`[Sensor] Locker hardware sync step. Communicating with RS485 board...`);
    }

    // 2. Animate Mic/Pulse and audio wave
    if (liveMicBtn) liveMicBtn.classList.add('active');
    waveAmplitude = 16.0; // High active signal pulse

    // 3. Update locker grid states in memory during turns to sync visuals
    if (currentScenario === 'reception') {
      // Deposit scenario
      if (currentTurnIndex === 2) {
        // allocation & open door #3
        lockers[2].status = 'DOOR_OPEN';
        lockers[2].plate = '1234';
        renderCabinetLockerGrid();
      } else if (currentTurnIndex === 4) {
        // door closed & occupied #3
        lockers[2].status = 'RENTED';
        renderCabinetLockerGrid();
      }
    } else if (currentScenario === 'treatment') {
      // Pick up scenario
      if (currentTurnIndex === 0) {
        // seed target locker to rented first
        lockers[2].status = 'RENTED';
        lockers[2].plate = '1234';
        lockers[2].pin = '4821';
        renderCabinetLockerGrid();
      } else if (currentTurnIndex === 3) {
        // door opens #3
        lockers[2].status = 'DOOR_OPEN';
        renderCabinetLockerGrid();
      } else if (currentTurnIndex === 4) {
        // door closed & empty #3
        lockers[2].status = 'EMPTY';
        renderCabinetLockerGrid();
      }
    } else if (currentScenario === 'pharmacy') {
      // Tech scenario
      if (currentTurnIndex === 0) {
        lockers[2].status = 'RENTED';
        lockers[2].plate = '1234';
        renderCabinetLockerGrid();
      } else if (currentTurnIndex === 2) {
        // opens
        lockers[2].status = 'DOOR_OPEN';
        renderCabinetLockerGrid();
      } else if (currentTurnIndex === 4) {
        // closed & rented back
        lockers[2].status = 'RENTED';
        renderCabinetLockerGrid();
      }
    } else if (currentScenario === 'fault') {
      // Fault scenario
      if (currentTurnIndex === 2) {
        lockers[11].status = 'DOOR_OPEN';
        lockers[11].plate = '9999';
        renderCabinetLockerGrid();
      } else if (currentTurnIndex === 4) {
        // door error
        lockers[11].status = 'DOOR_ERROR';
        renderCabinetLockerGrid();
      }
    }

    // 4. Append bubble to Kiosk Interaction log (left panel)
    const container = patientMessagesContainer;
    const bubbleObj = appendMessageBubble(container, turn.text, turn.trans);

    if (bubbleObj) {
      // 5. Type out text
      typeText(bubbleObj.textEl, bubbleObj.cursor, turn.text, bubbleObj.transEl, turn.trans, 40, () => {
        // Typing completes
        if (liveMicBtn) liveMicBtn.classList.remove('active');
        waveAmplitude = 1.5; // back to quiet
        logSystemEvent(speaker === 'patient'
          ? "[API] Kiosk screen transition executed successfully."
          : "[Sensor] Locker state feedback synced with server database."
        );

        currentTurnIndex++;

        // 6. Autoplay next turn or wait for manual click
        if (autoplayEnabled) {
          const t = setTimeout(runSignageTurn, 2200); // Wait 2.2s before next turn
          signageTimeouts.push(t);
        } else {
          isSignageSimRunning = false;
          if (btnNextTurn) {
            btnNextTurn.disabled = false;
            if (currentTurnIndex >= scenario.turns.length) {
              btnNextTurn.textContent = "완료";
              btnNextTurn.disabled = true;
            } else {
              btnNextTurn.textContent = "다음 단계 ⏭️";
            }
          }
        }
      });
    } else {
      isSignageSimRunning = false;
    }
  }

  // Trigger next turn manually on Mic button click if Autoplay is OFF
  const liveMicBtn = document.getElementById('btn-live-mic');
  if (liveMicBtn) {
    liveMicBtn.addEventListener('click', () => {
      if (!autoplayEnabled && !isSignageSimRunning) {
        if (btnNextTurn && !btnNextTurn.disabled) {
          btnNextTurn.click();
        }
      }
    });
  }

  // System logging simulator
  const randomSignageLogs = [
    "Sensor Scan: RS485 loop checklist complete. 20 locking relays normal.",
    "API Sync: Heartbeat ping: 14ms (via client gateway API).",
    "Security: Cleared cache memory block. Security pin logs flushed.",
    "Hardware: Charging auxiliary battery pack. Current load: 1.2A.",
    "Sensor: Magnetic door sensor #8 loop checked: normal.",
    "API WebSocket: High database transcription confidence (99.8%)."
  ];

  function triggerRandomSignageLog() {
    if (activeMode !== 'dashboard') return;
    const idx = Math.floor(Math.random() * randomSignageLogs.length);
    logSystemEvent(randomSignageLogs[idx]);
  }

  function logSystemEvent(msg) {
    if (!eventLogBox) return;
    const time = new Date();
    const hh = String(time.getHours()).padStart(2, '0');
    const mm = String(time.getMinutes()).padStart(2, '0');
    const ss = String(time.getSeconds()).padStart(2, '0');
    
    const logItem = document.createElement('div');
    logItem.className = 'log-entry';
    if (msg.includes('Alert') || msg.includes('Warning') || msg.includes('경고') || msg.includes('오류')) {
      logItem.className = 'log-entry alert';
    }
    logItem.innerHTML = `<span class="log-time">[${hh}:${mm}:${ss}]</span> <span class="log-msg">${msg}</span>`;
    
    eventLogBox.appendChild(logItem);
    eventLogBox.scrollTop = eventLogBox.scrollHeight;
  }

  // Handle initialization of slide views
  updateSlideView();

  // ==========================================
  // DASHBOARD-ONLY PAGE INITIALIZATION
  // 슬라이드덱/모드토글이 존재하지 않는 dashboard.html에서는
  // 대시보드(키오스크 시뮬레이터)를 기본 화면으로 표시하고 가동한다.
  // 슬라이드/모드토글 요소는 모두 널가드 처리되어 있으므로 부재 시에도 안전하다.
  // ==========================================
  const slideDeckPresent = !!pitchContainer || !!document.getElementById('slide-1');
  if (!slideDeckPresent && dashboardContainer) {
    switchMode('dashboard');
  }

});
