/* =====================================================================
   worker.js — Web Worker entry point for VectorSwift.
   Runs raster→SVG tracing off the main thread so the UI never freezes,
   no matter how long a high-quality level takes on a complex image.
   Loads the vendored ImageTracer.js library into the worker scope via
   importScripts (same library, same behavior as before — just loaded
   as a real file instead of being pasted into a Blob string).
   ===================================================================== */
importScripts('imagetracer.js');

function mergeSimilarPaletteColors(cq, threshold){
  // Collapse palette entries that are visually indistinguishable (within
  // 'threshold' summed RGBA distance) into one before layering. This is
  // the exact same expansion imagedataToTracedata does internally, split
  // into steps so we can splice in the merge between quantization and
  // layering — the two most expensive stages for a many-color palette.
  var pal = cq.palette, n = pal.length;
  var remap = new Array(n).fill(-1);
  var keep = [];
  for(var i=0;i<n;i++){
    if(remap[i] !== -1) continue;
    remap[i] = keep.length;
    keep.push(pal[i]);
    for(var j=i+1;j<n;j++){
      if(remap[j] !== -1) continue;
      var d = Math.abs(pal[i].r-pal[j].r) + Math.abs(pal[i].g-pal[j].g) + Math.abs(pal[i].b-pal[j].b) + Math.abs(pal[i].a-pal[j].a);
      if(d <= threshold) remap[j] = keep.length - 1;
    }
  }
  var arr = cq.array;
  for(var y=0;y<arr.length;y++){
    for(var x=0;x<arr[y].length;x++){
      if(arr[y][x] >= 0) arr[y][x] = remap[arr[y][x]];
    }
  }
  return { array: arr, palette: keep };
}

function traceOneLevel(imagedata, opt){
  var IT = self.ImageTracer;
  var cq = IT.colorquantization(imagedata, opt);
  if(opt.mergeThreshold > 0){
    cq = mergeSimilarPaletteColors(cq, opt.mergeThreshold);
  }
  var layers = IT.layering(cq);
  var paths = IT.batchpathscan(layers, opt.pathomit);
  var inodes = IT.batchinternodes(paths, opt);
  var traced = IT.batchtracelayers(inodes, opt.ltres, opt.qtres);
  var tracedata = { layers: traced, palette: cq.palette, width: imagedata.width, height: imagedata.height };
  var svg = IT.getsvgstring(tracedata, opt);
  return { svg: svg, paletteLength: tracedata.palette.length };
}

self.onmessage = function(e){
  try{
    var d = e.data;
    var imagedata = { width: d.width, height: d.height, data: d.data };
    var result = traceOneLevel(imagedata, d.options);
    self.postMessage({ ok:true, level: d.level, svg: result.svg, paletteLength: result.paletteLength });
  }catch(err){
    self.postMessage({ ok:false, level: e.data && e.data.level, error: (err && err.message) ? err.message : String(err) });
  }
};
