/* =====================================================================
   converter.js — Talks to the Web Worker(s). One function to build engine
   options from a preset, one to spawn a tracer worker, and one to run a
   single trace job with success/error callbacks. app.js calls this for
   both the single-level flow and each level of a batch flow, instead of
   duplicating worker wiring three times.
   ===================================================================== */
window.VS = window.VS || {};

(function(){
  "use strict";

  function buildEngineOptions(level){
    var preset = VS.PRESETS[level];
    return Object.assign({}, preset.options, { scale:1, viewbox:false, desc:false, layering:0, mincolorratio:0, colorsampling:2, linefilter:false, lcpr:0, qcpr:0, blurdelta:20, corsenabled:false });
  }

  function createTracerWorker(){
    // Loaded as a real file (js/worker.js), which importScripts()'s the
    // vendored ImageTracer.js itself — same engine, same options, just no
    // longer stitched together as a Blob string at runtime.
    return new Worker('js/worker.js');
  }

  /**
   * Run one trace job on a fresh worker.
   * imageData: {width,height,data} — caller decides whether `data` needs
   * to be a defensive copy (batch mode slices per-level so concurrent
   * postMessage calls don't share a typed array reference).
   * handlers: { onDone(svgString, paletteLength), onError(err) }
   * Returns the worker (so the caller can cancel it), or null if the
   * worker couldn't even be created/started.
   */
  function traceLevel(imageData, level, handlers){
    var worker;
    try{
      worker = createTracerWorker();
    }catch(err){
      handlers.onError(err);
      return null;
    }

    worker.onmessage = function(e){
      var msg = e.data;
      try{ worker.terminate(); }catch(err){}
      if(!msg || !msg.ok){
        handlers.onError(new Error((msg && msg.error) || 'trace-failed'));
        return;
      }
      handlers.onDone(msg.svg, msg.paletteLength);
    };
    worker.onerror = function(err){
      try{ worker.terminate(); }catch(e){}
      handlers.onError(err);
    };

    try{
      worker.postMessage({
        width: imageData.width,
        height: imageData.height,
        data: imageData.data,
        options: buildEngineOptions(level),
        level: level
      });
    }catch(err){
      try{ worker.terminate(); }catch(e){}
      handlers.onError(err);
      return null;
    }

    return worker;
  }

  VS.converter = {
    buildEngineOptions: buildEngineOptions,
    createTracerWorker: createTracerWorker,
    traceLevel: traceLevel
  };
})();
