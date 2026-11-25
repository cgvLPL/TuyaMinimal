/* TEMPORARY viewport diagnostic (2.93.14). Remove once the bottom band is fixed. */
(function () {
  var d = document;
  function mk(css, txt) { var e = d.createElement('div'); e.style.cssText = 'position:fixed;pointer-events:none;z-index:2147483647;' + css; if (txt) e.textContent = txt; d.body.appendChild(e); return e; }
  function px(v) { var e = mk('left:0;top:0;width:0;visibility:hidden;height:' + v); var h = e.getBoundingClientRect().height; e.remove(); return Math.round(h * 10) / 10; }
  function inset(s) { var e = mk('visibility:hidden;padding-' + s + ':env(safe-area-inset-' + s + ',0px)'); var p = 'padding' + s[0].toUpperCase() + s.slice(1); var v = parseFloat(getComputedStyle(e)[p]) || 0; e.remove(); return v; }
  var box = mk('left:10px;right:10px;top:150px;background:rgba(0,0,0,.82);color:#7CFC00;font:11px/1.35 ui-monospace,Menlo,monospace;padding:8px 10px;border-radius:10px;white-space:pre-wrap');
  var m = [
    mk('left:0;right:0;height:4px;bottom:0;background:#ff2d55'),
    mk('left:0;width:30%;height:4px;background:#0a84ff'),
    mk('left:30%;width:30%;height:4px;background:#ffd60a'),
    mk('left:60%;width:30%;height:4px;background:#bf5af2'),
    mk('left:90%;width:10%;height:4px;background:#ffffff')
  ];
  function run() {
    var vv = window.visualViewport;
    m[1].style.top = (px('100lvh') - 4) + 'px';
    m[2].style.top = (px('100dvh') - 4) + 'px';
    m[3].style.top = (px('100svh') - 4) + 'px';
    m[4].style.top = (screen.height - 4) + 'px';
    var os = (navigator.userAgent.match(/OS (\d+[_\d]*)/) || [])[1];
    box.textContent = [
      'iOS ' + (os || '?').replace(/_/g, '.') + '  standalone=' + navigator.standalone,
      'innerH ' + innerHeight + '  outerH ' + outerHeight + '  screenH ' + screen.height,
      'visualViewport.h ' + (vv ? Math.round(vv.height * 10) / 10 : 'n/a'),
      '100vh ' + px('100vh') + '  lvh ' + px('100lvh') + '  dvh ' + px('100dvh') + '  svh ' + px('100svh'),
      'fixed bottom:0 -> y=' + Math.round(m[0].getBoundingClientRect().bottom * 10) / 10,
      'safe top ' + inset('top') + '  bottom ' + inset('bottom'),
      'legend: red=fixed bottom, blue=lvh, yellow=dvh, purple=svh, white=screen.height'
    ].join('\n');
  }
  run();
  addEventListener('resize', run);
  addEventListener('orientationchange', function () { setTimeout(run, 300); });
})();
