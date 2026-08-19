/* =====================================================================
   app.js — State, DOM wiring, and UI logic for VectorSwift.
   Uses VS.PRESETS / VS.LIMITS / VS.LEVEL_ICONS (presets.js),
   VS.utils.* (utils.js), and VS.converter.traceLevel (converter.js).
   ===================================================================== */
(function(){
  "use strict";

  var PRESETS = VS.PRESETS;
  var DEFAULT_LEVEL = VS.DEFAULT_LEVEL;
  var LIMITS = VS.LIMITS;
  var ACCEPTED_TYPES = VS.ACCEPTED_TYPES;
  var BATCH_LEVEL_NAMES = VS.BATCH_LEVEL_NAMES;
  var LEVEL_ICONS = VS.LEVEL_ICONS;
  var PROCESS_MESSAGES = VS.PROCESS_MESSAGES;
  var fmtBytes = VS.utils.fmtBytes;
  var fmtTime = VS.utils.fmtTime;
  var extToSvgName = VS.utils.extToSvgName;
  var baseNameNoExt = VS.utils.baseNameNoExt;
  var logErr = VS.utils.logErr;
  var triggerDownload = VS.utils.triggerDownload;
  var traceLevel = VS.converter.traceLevel;

  /* ============ DOM refs ============ */
  var el = {
    body: document.body,
    themeToggle: document.getElementById('themeToggle'),
    themeIcon: document.getElementById('themeIcon'),
    dropzone: document.getElementById('dropzone'),
    fileInput: document.getElementById('fileInput'),
    fileCard: document.getElementById('fileCard'),
    fileThumb: document.getElementById('fileThumb'),
    fileName: document.getElementById('fileName'),
    fileSize: document.getElementById('fileSize'),
    fileRes: document.getElementById('fileRes'),
    resizeNote: document.getElementById('resizeNote'),
    changeFileBtn: document.getElementById('changeFileBtn'),
    sectionLevel: document.getElementById('sectionLevel'),
    levelScroll: document.getElementById('levelScroll'),
    levelHintText: document.getElementById('levelHintText'),
    selectAllBtn: document.getElementById('selectAllBtn'),
    sectionProcessing: document.getElementById('sectionProcessing'),
    processThumb: document.getElementById('processThumb'),
    processSub: document.getElementById('processSub'),
    processElapsed: document.getElementById('processElapsed'),
    processReassure: document.getElementById('processReassure'),
    processCancelBtn: document.getElementById('processCancelBtn'),
    sectionBatch: document.getElementById('sectionBatch'),
    batchHeading: document.getElementById('batchHeading'),
    batchRows: document.getElementById('batchRows'),
    batchElapsed: document.getElementById('batchElapsed'),
    batchSummary: document.getElementById('batchSummary'),
    batchCancelBtn: document.getElementById('batchCancelBtn'),
    sectionError: document.getElementById('sectionError'),
    errorTitle: document.getElementById('errorTitle'),
    errorBody: document.getElementById('errorBody'),
    errorRetryBtn: document.getElementById('errorRetryBtn'),
    sectionResult: document.getElementById('sectionResult'),
    resultLevelTag: document.getElementById('resultLevelTag'),
    resultLevelIcon: document.getElementById('resultLevelIcon'),
    resultLevelLabel: document.getElementById('resultLevelLabel'),
    compareWrap: document.getElementById('compareWrap'),
    compareOriginal: document.getElementById('compareOriginal'),
    compareSvg: document.getElementById('compareSvg'),
    compareHandle: document.getElementById('compareHandle'),
    compareRange: document.getElementById('compareRange'),
    statSize: document.getElementById('statSize'),
    statTime: document.getElementById('statTime'),
    statColors: document.getElementById('statColors'),
    statPaths: document.getElementById('statPaths'),
    sizeWarning: document.getElementById('sizeWarning'),
    sizeWarningText: document.getElementById('sizeWarningText'),
    manualDownloadLink: document.getElementById('manualDownloadLink'),
    actionBar: document.getElementById('actionBar'),
    mainActionBtn: document.getElementById('mainActionBtn'),
    mainActionLabel: document.getElementById('mainActionLabel'),
    resetBtn: document.getElementById('resetBtn')
  };

  /* ============ State ============ */
  var state = {
    phase: 'idle', // idle | fileReady | processing | batchProcessing | success | batchSuccess | error
    file: null,
    originalName: '',
    imageData: null,   // {width,height,data:Uint8ClampedArray} for worker
    previewDataUrl: '', // for thumbnails/compare "original" side
    selectedLevels: {}, // { levelNum: true } — multi-select; init after DEFAULT_LEVEL is defined
    singleLevel: null,  // which level was used for the last single conversion
    svgString: '',
    svgDataUrl: '',
    stats: null,
    worker: null,
    reassureHandle: null,
    elapsedInterval: null,
    processStartTime: null,
    subMsgHandle: null,
    // batch mode
    batch: null // { levels:[...], results:{lvl:{status,svgString,svgDataUrl,stats,worker}}, startTime, elapsedInterval, order:[] }
  };
  state.selectedLevels[DEFAULT_LEVEL] = true;

  function selectedLevelsList(){
    return [1,2,3,4,5].filter(function(l){ return !!state.selectedLevels[l]; });
  }

  /* ============ Theme ============ */
  function applyTheme(t){
    el.body.setAttribute('data-theme', t);
    el.themeIcon.innerHTML = t === 'dark'
      ? '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/>'
      : '<circle cx="12" cy="12" r="4.2"/><path d="M12 3v2M12 19v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M3 12h2M19 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"/>';
  }
  var prefersLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
  applyTheme(prefersLight ? 'light' : 'dark');
  el.themeToggle.addEventListener('click', function(){
    var cur = el.body.getAttribute('data-theme');
    applyTheme(cur === 'dark' ? 'light' : 'dark');
  });

  /* ============ Level cards render (multi-select) ============ */
  function buildLevelCards(){
    el.levelScroll.innerHTML = '';
    [1,2,3,4,5].forEach(function(lvl){
      var p = PRESETS[lvl];
      var isSelected = !!state.selectedLevels[lvl];
      var card = document.createElement('button');
      card.type = 'button';
      card.className = 'level-card' + (isSelected ? ' selected active' : '');
      card.setAttribute('data-level', lvl);
      card.innerHTML =
        '<div class="level-checkbox"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 5 5L20 7"/></svg></div>' +
        '<div class="level-icon"><img src="' + LEVEL_ICONS[lvl] + '" alt="ไอคอนระดับ ' + lvl + '" loading="lazy"></div>' +
        '<div class="name">' + p.name + '</div>' +
        '<div class="desc">' + p.desc + '</div>';
      card.addEventListener('click', function(){
        var willSelect = !state.selectedLevels[lvl];
        // guard: don't allow zero levels selected — keep at least one
        if(!willSelect && selectedLevelsList().length === 1) return;
        state.selectedLevels[lvl] = willSelect;
        buildLevelCards();
        render();
      });
      el.levelScroll.appendChild(card);
    });
    updateSelectAllBtn();
  }

  function updateSelectAllBtn(){
    var allOn = selectedLevelsList().length === 5;
    el.selectAllBtn.textContent = allOn ? 'ยกเลิกทั้งหมด' : 'เลือกทั้งหมด';
  }

  el.selectAllBtn.addEventListener('click', function(){
    var allOn = selectedLevelsList().length === 5;
    if(allOn){
      state.selectedLevels = {}; state.selectedLevels[DEFAULT_LEVEL] = true;
    } else {
      [1,2,3,4,5].forEach(function(l){ state.selectedLevels[l] = true; });
    }
    buildLevelCards();
    render();
  });

  /* ============ Render / phase visibility ============ */
  function render(){
    el.sectionLevel.classList.toggle('hidden', !(state.phase !== 'idle'));
    el.sectionProcessing.classList.toggle('hidden', state.phase !== 'processing');
    el.sectionBatch.classList.toggle('hidden', !(state.phase === 'batchProcessing' || state.phase === 'batchSuccess'));
    el.sectionError.classList.toggle('hidden', state.phase !== 'error');
    el.sectionResult.classList.toggle('hidden', state.phase !== 'success');
    el.fileCard.classList.toggle('hidden', state.phase === 'idle');
    el.dropzone.classList.toggle('hidden', state.phase !== 'idle');
    el.resetBtn.classList.toggle('hidden', !(state.phase === 'success' || state.phase === 'batchSuccess' || state.phase === 'error'));
    el.batchCancelBtn.classList.toggle('hidden', state.phase !== 'batchProcessing');

    var count = selectedLevelsList().length;
    var isMulti = count > 1;

    // main action button
    var btn = el.mainActionBtn, label = el.mainActionLabel;
    btn.classList.remove('success');
    btn.disabled = false;
    var iconSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 5 5L20 7"/></svg>';

    if(state.phase === 'idle'){
      btn.disabled = true;
      btn.innerHTML = iconSvg + '<span>เลือกไฟล์เพื่อเริ่ม</span>';
    } else if(state.phase === 'fileReady'){
      btn.disabled = false;
      var convertLabel = isMulti ? ('แปลงเป็น SVG (' + count + ' ระดับ)') : 'แปลงเป็น SVG';
      btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 17 L10 7 L14 13 L17 9 L20 17 Z"/></svg><span>' + convertLabel + '</span>';
    } else if(state.phase === 'processing' || state.phase === 'batchProcessing'){
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner"></span><span>กำลังประมวลผล...</span>';
    } else if(state.phase === 'success'){
      btn.disabled = false;
      btn.classList.add('success');
      btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v13M6 11l6 6 6-6"/><path d="M5 21h14"/></svg><span>ดาวน์โหลด SVG</span>';
    } else if(state.phase === 'batchSuccess'){
      btn.disabled = false;
      btn.classList.add('success');
      var doneCount = state.batch ? state.batch.order.filter(function(l){ return state.batch.results[l].status === 'done'; }).length : 0;
      btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v13M6 11l6 6 6-6"/><path d="M5 21h14"/></svg><span>ดาวน์โหลดทั้งหมด (' + doneCount + ')</span>';
    } else if(state.phase === 'error'){
      btn.disabled = true;
      btn.innerHTML = iconSvg + '<span>เลือกไฟล์เพื่อเริ่ม</span>';
    }
  }

  /* ============ File selection & validation ============ */
  function openFilePicker(){ el.fileInput.click(); }
  el.dropzone.addEventListener('click', openFilePicker);
  el.dropzone.addEventListener('keydown', function(e){ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); openFilePicker(); } });
  el.changeFileBtn.addEventListener('click', openFilePicker);

  // optional drag & drop as a progressive enhancement (not the primary flow)
  ['dragover','dragenter'].forEach(function(evt){
    el.dropzone.addEventListener(evt, function(e){ e.preventDefault(); el.dropzone.classList.add('drag'); });
  });
  ['dragleave','drop'].forEach(function(evt){
    el.dropzone.addEventListener(evt, function(e){ e.preventDefault(); el.dropzone.classList.remove('drag'); });
  });
  el.dropzone.addEventListener('drop', function(e){
    var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if(f) handleFile(f);
  });

  el.fileInput.addEventListener('change', function(){
    var f = el.fileInput.files && el.fileInput.files[0];
    if(f) handleFile(f);
    el.fileInput.value = '';
  });

  function handleFile(file){
    resetResultState();

    if(ACCEPTED_TYPES.indexOf(file.type) === -1){
      showError("ไม่รองรับไฟล์นี้", "รองรับเฉพาะไฟล์ PNG, JPG และ WebP เท่านั้น กรุณาเลือกไฟล์รูปแบบอื่น");
      return;
    }
    if(file.size > LIMITS.maxFileBytes){
      showError("ไฟล์มีขนาดใหญ่เกินไป", "ไฟล์นี้มีขนาดใหญ่เกินไปสำหรับการแปลงบนอุปกรณ์นี้ (สูงสุด " + fmtBytes(LIMITS.maxFileBytes) + ") ลองใช้รูปที่มีขนาดเล็กลง");
      return;
    }

    state.file = file;
    state.originalName = file.name;

    var objectUrl;
    try{
      objectUrl = URL.createObjectURL(file);
    }catch(err){
      logErr('createObjectURL', err);
      showError("เปิดไฟล์ไม่สำเร็จ", "ไม่สามารถเปิดไฟล์รูปนี้ได้ ลองใช้รูปอื่น");
      return;
    }

    var img = new Image();
    img.onload = function(){
      try{
        prepareImageData(img, file);
      }catch(err){
        logErr('prepareImageData', err);
        showError("ประมวลผลรูปไม่สำเร็จ", "อุปกรณ์นี้มีหน่วยความจำไม่เพียงพอสำหรับรูปขนาดนี้ ลองใช้รูปที่เล็กลง");
      }finally{
        URL.revokeObjectURL(objectUrl);
      }
    };
    img.onerror = function(){
      URL.revokeObjectURL(objectUrl);
      showError("เปิดไฟล์ไม่สำเร็จ", "ไม่สามารถเปิดไฟล์รูปนี้ได้ ไฟล์อาจเสียหายหรือไม่ใช่รูปภาพที่ถูกต้อง");
    };
    img.src = objectUrl;
  }

  function prepareImageData(img, file){
    var origW = img.naturalWidth, origH = img.naturalHeight;
    var longEdge = Math.max(origW, origH);
    var scale = longEdge > LIMITS.maxLongEdge ? (LIMITS.maxLongEdge / longEdge) : 1;
    var drawW = Math.max(1, Math.round(origW * scale));
    var drawH = Math.max(1, Math.round(origH * scale));

    var canvas = document.createElement('canvas');
    canvas.width = drawW; canvas.height = drawH;
    var ctx = canvas.getContext('2d');
    if(!ctx) throw new Error('no-2d-context');
    ctx.drawImage(img, 0, 0, drawW, drawH);

    var imgData;
    try{
      imgData = ctx.getImageData(0, 0, drawW, drawH);
    }catch(err){
      throw err;
    }

    state.imageData = { width: drawW, height: drawH, data: imgData.data };
    state.previewDataUrl = canvas.toDataURL('image/png');

    // UI: file card
    el.fileThumb.src = state.previewDataUrl;
    el.fileName.textContent = file.name;
    el.fileSize.textContent = fmtBytes(file.size);
    el.fileRes.textContent = origW + " × " + origH + " px";

    if(scale < 1){
      el.resizeNote.classList.remove('hidden');
      el.resizeNote.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex:none;margin-top:1px;"><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/></svg><span>ปรับขนาดเป็น ' + drawW + ' × ' + drawH + ' px เพื่อให้ประมวลผลได้บนอุปกรณ์นี้</span>';
    } else {
      el.resizeNote.classList.add('hidden');
      el.resizeNote.innerHTML = '';
    }

    buildLevelCards();
    setPhase('fileReady');
  }

  function setPhase(p){ state.phase = p; render(); }

  function resetResultState(){
    if(state.worker){ try{ state.worker.terminate(); }catch(e){} state.worker = null; }
    if(state.reassureHandle){ clearTimeout(state.reassureHandle); state.reassureHandle = null; }
    if(state.elapsedInterval){ clearInterval(state.elapsedInterval); state.elapsedInterval = null; }
    if(state.subMsgHandle){ clearInterval(state.subMsgHandle); state.subMsgHandle = null; }
    state.svgString = ''; state.svgDataUrl = ''; state.stats = null; state.singleLevel = null;
    el.sizeWarning.classList.add('hidden');
    el.manualDownloadLink.classList.add('hidden');
    el.manualDownloadLink.removeAttribute('href');
    el.processReassure.classList.add('hidden');
    el.resultLevelTag.classList.add('hidden');
    teardownBatch();
  }

  function teardownBatch(){
    if(state.batch){
      if(state.batch.elapsedInterval){ clearInterval(state.batch.elapsedInterval); }
      state.batch.order.forEach(function(lvl){
        var r = state.batch.results[lvl];
        if(r && r.worker){ try{ r.worker.terminate(); }catch(e){} }
      });
    }
    state.batch = null;
  }

  function showError(title, body){
    resetResultState();
    el.errorTitle.textContent = title;
    el.errorBody.textContent = body;
    setPhase('error');
  }

  el.errorRetryBtn.addEventListener('click', function(){
    if(state.imageData){ setPhase('fileReady'); }
    else { setPhase('idle'); }
  });

  el.resetBtn.addEventListener('click', function(){
    resetResultState();
    state.file = null;
    state.imageData = null;
    state.previewDataUrl = '';
    setPhase('idle');
  });

  /* ============ Convert / Download main action ============ */
  el.mainActionBtn.addEventListener('click', function(){
    if(el.mainActionBtn.disabled) return; // hard guard against double-taps
    if(state.phase === 'fileReady'){
      var levels = selectedLevelsList();
      if(levels.length > 1){ startBatchConversion(levels); }
      else { startConversion(levels[0]); }
    }
    else if(state.phase === 'success'){ downloadSvg(); }
    else if(state.phase === 'batchSuccess'){ downloadAllBatch(); }
  });

  /* ============ Single-level conversion ============ */
  function startConversion(level){
    if(!state.imageData) return;
    state.singleLevel = level;
    setPhase('processing');
    el.processThumb.src = state.previewDataUrl;

    var msgIdx = 0;
    el.processSub.textContent = PROCESS_MESSAGES[0];
    state.subMsgHandle = setInterval(function(){
      msgIdx = (msgIdx + 1) % PROCESS_MESSAGES.length;
      el.processSub.textContent = PROCESS_MESSAGES[msgIdx];
    }, 1300);

    var startTime = performance.now();
    state.processStartTime = startTime;

    el.processElapsed.textContent = "0.0 วินาที";
    el.processReassure.classList.add('hidden');
    state.elapsedInterval = setInterval(function(){
      var s = (performance.now() - state.processStartTime) / 1000;
      el.processElapsed.textContent = s.toFixed(1) + " วินาที";
    }, 100);

    // No hard fail here — the Web Worker runs off the main thread, so the
    // page stays responsive no matter how long this takes. We just reassure
    // the person it hasn't frozen, and let them cancel manually if they want.
    state.reassureHandle = setTimeout(function(){
      el.processReassure.classList.remove('hidden');
    }, LIMITS.reassureAfterMs);

    var worker = traceLevel(state.imageData, level, {
      onDone: function(svg, paletteLength){
        finishProcessingUI();
        state.worker = null;
        var elapsed = performance.now() - startTime;
        onConversionSuccess(svg, paletteLength, elapsed);
      },
      onError: function(err){
        finishProcessingUI();
        state.worker = null;
        logErr('single-conversion-fail', err);
        showError("การแปลงภาพล้มเหลว", "เครื่องมือแปลงภาพไม่สามารถประมวลผลรูปนี้ได้ ลองใหม่อีกครั้งหรือเลือกระดับคุณภาพอื่น");
      }
    });

    if(!worker){
      finishProcessingUI();
      showError("แปลงไฟล์ไม่สำเร็จ", "เบราว์เซอร์นี้ไม่รองรับการประมวลผลเบื้องหลังที่จำเป็น ลองใช้เบราว์เซอร์อื่น เช่น Chrome");
      return;
    }
    state.worker = worker;
  }

  function finishProcessingUI(){
    if(state.subMsgHandle){ clearInterval(state.subMsgHandle); state.subMsgHandle = null; }
    if(state.reassureHandle){ clearTimeout(state.reassureHandle); state.reassureHandle = null; }
    if(state.elapsedInterval){ clearInterval(state.elapsedInterval); state.elapsedInterval = null; }
  }

  el.processCancelBtn.addEventListener('click', function(){
    if(state.worker){ try{ state.worker.terminate(); }catch(e){} state.worker = null; }
    finishProcessingUI();
    setPhase('fileReady');
  });

  function onConversionSuccess(svgString, paletteLength, elapsedMs){
    state.svgString = svgString;
    var blob = new Blob([svgString], { type: 'image/svg+xml' });
    state.svgDataUrl = URL.createObjectURL(blob);

    var pathCount = (svgString.match(/<path /g) || []).length;
    state.stats = {
      bytes: blob.size,
      colors: paletteLength,
      paths: pathCount,
      timeMs: elapsedMs
    };

    // level tag header (ties single-result design language to the level picker / batch cards)
    if(state.singleLevel && LEVEL_ICONS[state.singleLevel]){
      el.resultLevelIcon.src = LEVEL_ICONS[state.singleLevel];
      el.resultLevelLabel.textContent = 'ระดับ ' + state.singleLevel + ' · ' + PRESETS[state.singleLevel].name;
      el.resultLevelTag.classList.remove('hidden');
    } else {
      el.resultLevelTag.classList.add('hidden');
    }

    // populate compare view
    el.compareOriginal.src = state.previewDataUrl;
    el.compareSvg.src = state.svgDataUrl;
    el.compareRange.value = 50;
    updateCompareSplit(50);

    el.statSize.textContent = fmtBytes(state.stats.bytes);
    el.statTime.textContent = fmtTime(state.stats.timeMs);
    el.statColors.textContent = String(state.stats.colors);
    el.statPaths.textContent = String(state.stats.paths);

    if(state.stats.bytes > LIMITS.svgWarnBytes){
      el.sizeWarning.classList.remove('hidden');
      el.sizeWarningText.textContent = "ไฟล์ SVG มีขนาดใหญ่ (" + fmtBytes(state.stats.bytes) + ") ลองเลือกระดับคุณภาพที่เบากว่าเพื่อไฟล์ที่เล็กลง";
    } else {
      el.sizeWarning.classList.add('hidden');
    }

    setPhase('success');
  }

  /* ============ Compare slider ============ */
  function updateCompareSplit(percent){
    percent = Math.max(0, Math.min(100, percent));
    el.compareSvg.style.clipPath = 'inset(0 0 0 ' + percent + '%)';
    el.compareHandle.style.left = percent + '%';
  }
  el.compareRange.addEventListener('input', function(){
    updateCompareSplit(Number(el.compareRange.value));
  });

  /* ============ Batch (multi-level, parallel) conversion ============ */
  function startBatchConversion(levels){
    if(!state.imageData) return;
    teardownBatch();

    var results = {};
    levels.forEach(function(lvl){ results[lvl] = { status:'queued', svgString:'', svgDataUrl:'', stats:null, worker:null }; });
    state.batch = { levels: levels, results: results, order: levels.slice(), startTime: performance.now(), elapsedInterval: null };

    el.batchHeading.textContent = 'กำลังสร้าง SVG ' + levels.length + ' ระดับพร้อมกัน';
    renderBatchCards();
    setPhase('batchProcessing');

    el.batchElapsed.textContent = '0.0 วินาที';
    state.batch.elapsedInterval = setInterval(function(){
      if(!state.batch) return;
      var s = (performance.now() - state.batch.startTime) / 1000;
      el.batchElapsed.textContent = s.toFixed(1) + ' วินาที';
    }, 100);

    // One worker per selected level, all started together — each level's
    // pixel data is a separate copy since typed arrays can't be shared
    // (transferred) across more than one worker at a time.
    levels.forEach(function(lvl){
      runBatchLevel(lvl);
    });
  }

  function runBatchLevel(lvl){
    var r = state.batch.results[lvl];
    r.status = 'processing';
    r.errorMsg = '';
    r.startTime = performance.now();

    var imageDataCopy = {
      width: state.imageData.width,
      height: state.imageData.height,
      data: state.imageData.data.slice() // independent copy per worker
    };

    var worker = traceLevel(imageDataCopy, lvl, {
      onDone: function(svg, paletteLength){
        var rr = state.batch && state.batch.results[lvl];
        if(!rr) return;
        rr.worker = null;
        var blob = new Blob([svg], { type: 'image/svg+xml' });
        var pathCount = (svg.match(/<path /g) || []).length;
        rr.status = 'done';
        rr.svgString = svg;
        rr.svgDataUrl = URL.createObjectURL(blob);
        rr.stats = { bytes: blob.size, colors: paletteLength, paths: pathCount, timeMs: performance.now() - rr.startTime };
        renderBatchCards();
        checkBatchDone();
      },
      onError: function(err){
        var rr = state.batch && state.batch.results[lvl];
        if(!rr) return;
        rr.worker = null;
        rr.status = 'error';
        rr.errorMsg = 'แปลงระดับนี้ไม่สำเร็จ';
        logErr('batch-level-fail', err);
        renderBatchCards();
        checkBatchDone();
      }
    });

    if(!worker){
      r.status = 'error';
      r.errorMsg = 'สร้าง worker ไม่สำเร็จ';
      renderBatchCards();
      checkBatchDone();
      return;
    }
    r.worker = worker;
    renderBatchCards();
  }

  function checkBatchDone(){
    if(!state.batch) return;
    var stillGoing = state.batch.order.some(function(lvl){
      var s = state.batch.results[lvl].status;
      return s === 'queued' || s === 'processing';
    });
    if(!stillGoing){
      if(state.batch.elapsedInterval){ clearInterval(state.batch.elapsedInterval); state.batch.elapsedInterval = null; }
      var doneCount = state.batch.order.filter(function(l){ return state.batch.results[l].status === 'done'; }).length;
      if(doneCount === 0){
        showError('การแปลงภาพล้มเหลว', 'แปลงไม่สำเร็จทุกระดับที่เลือก ลองใหม่อีกครั้งหรือเลือกระดับอื่น');
        return;
      }
      el.batchSummary.textContent = 'เสร็จแล้ว ' + doneCount + ' จาก ' + state.batch.order.length + ' ระดับ';
      setPhase('batchSuccess');
    }
  }

  /* Result cards — one per selected level, stacked vertically. Each card
     shows its own icon, live status (queued/processing/done/error), a
     preview once done, stats, and its own download/retry button. */
  function renderBatchCards(){
    if(!state.batch) return;
    // Completed rows bubble to the top in the order they finished; anything
    // still queued/processing stays below in level order — "whichever
    // finishes first shows up first."
    var done = [], pending = [];
    state.batch.order.forEach(function(lvl){
      var r = state.batch.results[lvl];
      if(r.status === 'done' || r.status === 'error') done.push(lvl); else pending.push(lvl);
    });
    if(!state.batch._finishOrder) state.batch._finishOrder = [];
    done.forEach(function(lvl){
      if(state.batch._finishOrder.indexOf(lvl) === -1) state.batch._finishOrder.push(lvl);
    });
    var doneSorted = state.batch._finishOrder.filter(function(l){ return done.indexOf(l) !== -1; });
    var orderedLevels = doneSorted.concat(pending);

    el.batchRows.innerHTML = '';
    orderedLevels.forEach(function(lvl){
      var r = state.batch.results[lvl];
      var card = document.createElement('div');
      card.className = 'result-card is-' + r.status;

      var statusText;
      if(r.status === 'queued') statusText = 'รอคิว...';
      else if(r.status === 'processing') statusText = 'กำลังประมวลผล...';
      else if(r.status === 'done') statusText = fmtBytes(r.stats.bytes) + ' · ' + fmtTime(r.stats.timeMs) + ' · ' + r.stats.paths + ' path';
      else statusText = r.errorMsg || 'ผิดพลาด';

      var indicator;
      if(r.status === 'queued' || r.status === 'processing'){
        indicator = '<div class="result-spinner"></div>';
      } else if(r.status === 'done'){
        indicator = '<div class="result-check"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 5 5L20 7"/></svg></div>';
      } else {
        indicator = '<div class="result-warn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/></svg></div>';
      }

      var top =
        '<div class="result-card-top">' +
          '<div class="level-icon sm"><img src="' + LEVEL_ICONS[lvl] + '" alt=""></div>' +
          '<div class="result-card-heading">' +
            '<div class="result-card-title">ระดับ ' + lvl + ' · ' + (BATCH_LEVEL_NAMES[lvl]||'') + '</div>' +
            '<div class="result-card-status">' + statusText + '</div>' +
          '</div>' +
          '<div class="result-card-indicator">' + indicator + '</div>' +
        '</div>';

      var body = '';
      if(r.status === 'done'){
        body +=
          '<div class="result-card-preview"><img src="' + r.svgDataUrl + '" alt="ตัวอย่าง SVG ระดับ ' + lvl + '"></div>' +
          '<div class="result-card-stats-row">' +
            '<span>ขนาด <b>' + fmtBytes(r.stats.bytes) + '</b></span>' +
            '<span>เวลา <b>' + fmtTime(r.stats.timeMs) + '</b></span>' +
            '<span>Path <b>' + r.stats.paths + '</b></span>' +
          '</div>' +
          '<div class="result-card-actions">' +
            '<button type="button" class="result-dl-btn" data-level="' + lvl + '">' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v13M6 11l6 6 6-6"/><path d="M5 21h14"/></svg>' +
              '<span>ดาวน์โหลด SVG</span>' +
            '</button>' +
          '</div>';
      } else if(r.status === 'error'){
        body +=
          '<div class="result-card-error-msg">' + (r.errorMsg || 'เกิดข้อผิดพลาดระหว่างประมวลผล') + '</div>' +
          '<div class="result-card-actions">' +
            '<button type="button" class="result-retry-btn" data-level="' + lvl + '">ลองใหม่</button>' +
          '</div>';
      }

      card.innerHTML = top + body;
      el.batchRows.appendChild(card);
    });

    // wire up per-card buttons (re-created each render, so re-bind each time)
    el.batchRows.querySelectorAll('.result-dl-btn').forEach(function(btn){
      btn.addEventListener('click', function(){
        var lvl = Number(btn.getAttribute('data-level'));
        downloadOneBatchLevel(lvl);
      });
    });
    el.batchRows.querySelectorAll('.result-retry-btn').forEach(function(btn){
      btn.addEventListener('click', function(){
        var lvl = Number(btn.getAttribute('data-level'));
        retryBatchLevel(lvl);
      });
    });
  }

  function retryBatchLevel(lvl){
    if(!state.batch || !state.imageData) return;
    renderBatchCards();
    if(!state.batch.elapsedInterval){
      state.batch.startTime = performance.now();
      state.batch.elapsedInterval = setInterval(function(){
        if(!state.batch) return;
        var s = (performance.now() - state.batch.startTime) / 1000;
        el.batchElapsed.textContent = s.toFixed(1) + ' วินาที';
      }, 100);
    }
    setPhase('batchProcessing');
    runBatchLevel(lvl);
  }

  el.batchCancelBtn.addEventListener('click', function(){
    if(!state.batch) return;
    state.batch.order.forEach(function(lvl){
      var r = state.batch.results[lvl];
      if((r.status === 'queued' || r.status === 'processing') && r.worker){
        try{ r.worker.terminate(); }catch(e){}
        r.status = 'error';
        r.errorMsg = 'ยกเลิกแล้ว';
      }
    });
    renderBatchCards();
    checkBatchDone();
  });

  /* ============ Download ============ */
  function downloadSvg(){
    if(!state.svgString) return;
    var filename = extToSvgName(state.originalName || 'image.svg');
    var blob = new Blob([state.svgString], { type: 'image/svg+xml' });
    triggerDownload(blob, filename, el.manualDownloadLink);
  }

  function downloadOneBatchLevel(lvl){
    var r = state.batch && state.batch.results[lvl];
    if(!r || r.status !== 'done') return;
    var filename = baseNameNoExt(state.originalName) + '-t' + lvl + '.svg';
    var blob = new Blob([r.svgString], { type: 'image/svg+xml' });
    triggerDownload(blob, filename, null);
  }

  function downloadAllBatch(){
    if(!state.batch) return;
    var doneLevels = state.batch.order.filter(function(l){ return state.batch.results[l].status === 'done'; });
    if(doneLevels.length === 0) return;

    // Direct browser downloads only — no share sheet. Stagger slightly so
    // mobile browsers don't drop rapid-fire downloads.
    doneLevels.forEach(function(lvl, i){ setTimeout(function(){ downloadOneBatchLevel(lvl); }, i * 350); });
  }

  /* ============ Init ============ */
  buildLevelCards();
  render();

})();
