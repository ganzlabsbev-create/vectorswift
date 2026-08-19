/* =====================================================================
   utils.js — Formatting helpers + the browser download mechanism.
   No app state, no DOM refs beyond what's passed in.
   ===================================================================== */
window.VS = window.VS || {};

(function(){
  "use strict";

  function fmtBytes(bytes){
    if(bytes < 1024) return bytes + " B";
    if(bytes < 1024*1024) return (bytes/1024).toFixed(1) + " KB";
    return (bytes/(1024*1024)).toFixed(2) + " MB";
  }

  function fmtTime(ms){
    if(ms < 1000) return Math.round(ms) + " ms";
    return (ms/1000).toFixed(1) + " วินาที";
  }

  function extToSvgName(name){
    var dot = name.lastIndexOf('.');
    var base = dot > -1 ? name.slice(0, dot) : name;
    return base + ".svg";
  }

  function baseNameNoExt(name){
    name = name || 'image';
    var dot = name.lastIndexOf('.');
    return dot > -1 ? name.slice(0, dot) : name;
  }

  function logErr(context, err){ console.error("[vectorswift]", context, err); }

  /**
   * Trigger a direct browser download for a Blob — no navigator.share(),
   * no Web Share API, no "open with" sheet. Just Blob + object URL +
   * a real <a download> click, which is the reliable path on Android
   * Chrome/WebView instead of bouncing through a share sheet.
   *
   * If a persistent anchor element is passed in, it's also updated as a
   * manual fallback (long-press → "Save link as") for embedded webviews
   * that occasionally swallow the programmatic click.
   */
  function triggerDownload(blob, filename, manualLinkEl){
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function(){ URL.revokeObjectURL(url); }, 4000);

    if(manualLinkEl){
      manualLinkEl.href = url;
      manualLinkEl.download = filename;
      manualLinkEl.classList.remove('hidden');
    }
  }

  VS.utils = {
    fmtBytes: fmtBytes,
    fmtTime: fmtTime,
    extToSvgName: extToSvgName,
    baseNameNoExt: baseNameNoExt,
    logErr: logErr,
    triggerDownload: triggerDownload
  };
})();
