/* =====================================================================
   presets.js — Conversion presets (level 1–5) mapped to engine options,
   plus shared limits/constants. No DOM, no state — pure config.
   ===================================================================== */
window.VS = window.VS || {};

(function(){
  "use strict";

  var PRESETS = {
    1:{ key:1, name:"เร็ว", desc:"รายละเอียดน้อยที่สุด ประมวลผลเร็ว ไฟล์ SVG เล็ก",
        options:{ numberofcolors:6,  ltres:2,   qtres:2,   pathomit:24, colorquantcycles:1, blurradius:0, roundcoords:1, strokewidth:0, rightangleenhance:true, mergeThreshold:0 } },
    2:{ key:2, name:"สมดุล", desc:"รายละเอียดและขนาดไฟล์สมดุล เหมาะกับการใช้งานทั่วไป",
        options:{ numberofcolors:12, ltres:1,   qtres:1,   pathomit:10, colorquantcycles:2, blurradius:0, roundcoords:1, strokewidth:0, rightangleenhance:true, mergeThreshold:0 } },
    3:{ key:3, name:"ละเอียด", desc:"เก็บรายละเอียดมากขึ้น ไฟล์ SVG ใหญ่ขึ้น ใช้เวลานานขึ้น",
        options:{ numberofcolors:20, ltres:0.6, qtres:0.6, pathomit:6,  colorquantcycles:3, blurradius:0, roundcoords:2, strokewidth:0, rightangleenhance:true, mergeThreshold:18 } },
    4:{ key:4, name:"คุณภาพสูง", desc:"เก็บรายละเอียดมาก จำนวน path และข้อมูล SVG เพิ่มขึ้น",
        options:{ numberofcolors:32, ltres:0.3, qtres:0.3, pathomit:3,  colorquantcycles:3, blurradius:0, roundcoords:2, strokewidth:0, rightangleenhance:true, mergeThreshold:18 } },
    5:{ key:5, name:"สูงสุด", desc:"คุณภาพสูงสุดที่รองรับ อาจใช้ RAM และเวลาประมวลผลมากที่สุด",
        options:{ numberofcolors:64, ltres:0.1, qtres:0.1, pathomit:0,  colorquantcycles:4, blurradius:0, roundcoords:2, strokewidth:0, rightangleenhance:true, mergeThreshold:18 } }
  };
  var DEFAULT_LEVEL = 2;
  // mergeThreshold: after color quantization, palette colors whose combined
  // RGBA distance is <= this get folded into one before layering/tracing.
  // Anti-aliased edges (font/shape fringes) create many near-duplicate
  // palette entries that add processing cost (layering scans once per
  // palette color) without adding anything visible — merging them is a
  // real speedup with no visual quality loss, verified by direct
  // before/after profiling, not a detail-reduction trick like lowering
  // numberofcolors would be. Levels 1-2 already use few colors so it's
  // skipped there (0 = disabled).

  var LIMITS = {
    maxFileBytes: 25 * 1024 * 1024,      // 25MB upload guard
    maxLongEdge: 2400,                    // downscale cap for browser memory safety
    reassureAfterMs: 15000,               // show "still working, not frozen" note after this long
    svgWarnBytes: 2 * 1024 * 1024         // warn if resulting SVG > 2MB
  };
  var ACCEPTED_TYPES = ["image/png","image/jpeg","image/webp"];

  var BATCH_LEVEL_NAMES = { 1:'เร็ว', 2:'สมดุล', 3:'ละเอียด', 4:'คุณภาพสูง', 5:'สูงสุด' };

  // Level icon artwork — the same VectorSwift mark traced at each quality
  // preset, used both in the level picker cards and on each result card.
  var LEVEL_ICONS = {
    1: 'assets/vectorswift-t1.svg',
    2: 'assets/vectorswift-t2.svg',
    3: 'assets/vectorswift-t3.svg',
    4: 'assets/vectorswift-t4.svg',
    5: 'assets/vectorswift-t5.svg'
  };

  var PROCESS_MESSAGES = ["กำลังวิเคราะห์สี...", "กำลังตรวจจับขอบภาพ...", "กำลังลาก path...", "กำลังปรับความโค้งของเส้น...", "กำลังประกอบไฟล์ SVG..."];

  VS.PRESETS = PRESETS;
  VS.DEFAULT_LEVEL = DEFAULT_LEVEL;
  VS.LIMITS = LIMITS;
  VS.ACCEPTED_TYPES = ACCEPTED_TYPES;
  VS.BATCH_LEVEL_NAMES = BATCH_LEVEL_NAMES;
  VS.LEVEL_ICONS = LEVEL_ICONS;
  VS.PROCESS_MESSAGES = PROCESS_MESSAGES;
})();
