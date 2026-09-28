/* Spellense pull-away page viewer. Drag a page by hand and pull it off the stack.
   Modes: "side" (drag left/right) and "up" (pull up by the handle, like a tear-off pad).
   Exposes window.SpellensePullStack(container, imageUrls, options) with the same
   methods the flipbook page uses for the curl engine. */
(function (w) {
  function Stack(container, pages, opts) {
    opts = opts || {};
    var api = this, n = pages.length, h = {}, drag = null, moving = -1, mt = 0, dead = false;
    var cur = Math.min(Math.max(opts.startPage | 0, 0), Math.max(n - 1, 0));
    var ratio = opts.ratio > 0 ? opts.ratio : 1.4, up = opts.mode === 'up';
    var shadow = opts.shadow == null ? 0.35 : opts.shadow;
    container.innerHTML = '';
    var root = document.createElement('div');
    root.style.cssText = 'position:relative;margin:0 auto;user-select:none;-webkit-user-select:none;touch-action:pan-y';
    container.appendChild(root);
    var els = [], gone = [];

    pages.forEach(function (src, i) {
      var el = document.createElement('div');
      el.style.cssText = 'position:absolute;top:0;left:0;right:0;bottom:0;border-radius:8px;overflow:hidden;background:#fff;will-change:transform;' +
        'transition:transform .42s cubic-bezier(.2,.8,.2,1),opacity .3s;box-shadow:0 12px 32px rgba(0,0,0,' + shadow + ')';
      var img = document.createElement('img');
      img.src = src; img.alt = 'Page ' + (i + 1); img.draggable = false;
      img.style.cssText = 'width:100%;height:100%;object-fit:contain;pointer-events:none;display:block;' +
        (opts.filter && opts.filter !== 'none' ? 'filter:' + opts.filter + ';' : '');
      el.appendChild(img);
      if (up) {
        var hd = document.createElement('div');
        hd.setAttribute('data-handle', '1');
        hd.textContent = '\u21E7 Pull up to tear off';
        hd.style.cssText = 'position:absolute;left:50%;bottom:12px;transform:translateX(-50%);padding:9px 18px;border-radius:999px;' +
          'background:rgba(15,23,42,.75);color:#fff;font:600 12px system-ui,sans-serif;touch-action:none;cursor:grab;transition:opacity .2s;white-space:nowrap';
        el.appendChild(hd); el._hd = hd;
      }
      root.appendChild(el); els.push(el); gone.push(i % 2 ? -1 : 1);
    });

    function size() {
      var maxW = Math.min(container.clientWidth || 520, 520);
      var maxH = Math.max(260, (w.innerHeight || 700) * 0.72);
      var wd = Math.max(160, Math.min(maxW, maxH / ratio));
      root.style.width = wd + 'px';
      root.style.height = Math.round(wd * ratio) + 'px';
    }
    function goneT(i) {
      return up ? 'translateY(-125%) rotate(' + (gone[i] * 3) + 'deg)'
                : 'translateX(' + (gone[i] * 125) + '%) rotate(' + (gone[i] * 16) + 'deg)';
    }
    function layout() {
      els.forEach(function (el, i) {
        var d = i - cur, t = 'none', o = 1;
        if (d < 0) { t = goneT(i); o = 0; }
        else if (d > 0 && d <= 2) { t = 'translateY(' + (d * 9) + 'px) scale(' + (1 - d * 0.035) + ')'; }
        else if (d > 2) { t = 'translateY(27px) scale(.9)'; o = 0; }
        el.style.transform = t; el.style.opacity = o;
        el.style.zIndex = i === moving ? 3000 : (d < 0 ? 100 + i : 1000 - i);
        el.style.pointerEvents = d === 0 ? 'auto' : 'none';
        if (el._hd) el._hd.style.opacity = d === 0 ? '1' : '0';
      });
    }
    function emit() { (h.flip || []).forEach(function (f) { f({ data: cur }); }); }
    function setCur(i) {
      i = Math.max(0, Math.min(n - 1, i));
      if (i === cur) { layout(); return; }
      moving = i < cur ? i : cur;
      cur = i; layout();
      clearTimeout(mt);
      mt = setTimeout(function () { moving = -1; layout(); }, 460);
      emit();
    }

    root.addEventListener('pointerdown', function (e) {
      if (dead || drag || n === 0 || e.button > 0) return;
      if (up && e.pointerType !== 'mouse' && !(e.target.closest && e.target.closest('[data-handle]'))) return;
      var el = els[cur];
      drag = { x: e.clientX, y: e.clientY, dx: 0, dy: 0, el: el, id: e.pointerId };
      el.style.transition = 'none';
      try { root.setPointerCapture(e.pointerId); } catch (x) {}
    });
    root.addEventListener('pointermove', function (e) {
      if (!drag || e.pointerId !== drag.id) return;
      var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      drag.dx = dx; drag.dy = dy;
      if (up) { dy = Math.min(0, dy); drag.el.style.transform = 'translateY(' + dy + 'px) rotate(' + (dx * 0.02) + 'deg)'; }
      else { drag.el.style.transform = 'translate(' + dx + 'px,' + (dy * 0.25) + 'px) rotate(' + (dx * 0.05) + 'deg)'; }
      var p = Math.min(1, (up ? -dy : Math.abs(dx)) / (root.clientWidth * 0.5));
      var nx = els[cur + 1];
      if (nx) { nx.style.transition = 'none'; nx.style.transform = 'translateY(' + (9 * (1 - p)) + 'px) scale(' + (0.965 + 0.035 * p) + ')'; }
    });
    function end(e) {
      if (!drag || (e && e.pointerId !== drag.id)) return;
      var d = drag; drag = null;
      d.el.style.transition = '';
      if (els[cur + 1]) els[cur + 1].style.transition = '';
      var dist = up ? -d.dy : Math.abs(d.dx);
      var tap = Math.abs(d.dx) < 6 && Math.abs(d.dy) < 6;
      if (tap && !up && e && e.type === 'pointerup') {
        var rc = root.getBoundingClientRect();
        if (e.clientX - rc.left > rc.width / 2) api.flipNext(); else api.flipPrev();
        return;
      }
      if (dist > Math.max(80, root.clientWidth * 0.22) && cur < n - 1) {
        gone[cur] = d.dx >= 0 ? 1 : -1;
        api.flipNext();
      } else { layout(); }
    }
    root.addEventListener('pointerup', end);
    root.addEventListener('pointercancel', end);

    var onResize = function () { size(); };
    w.addEventListener('resize', onResize);
    var ro = null;
    if (w.ResizeObserver) { ro = new w.ResizeObserver(onResize); ro.observe(container); }

    api.flipNext = function () { setCur(cur + 1); };
    api.flipPrev = function () { setCur(cur - 1); };
    api.flip = function (i) { setCur(i); };
    api.turnToPage = function (i) { setCur(i); };
    api.getCurrentPageIndex = function () { return cur; };
    api.getPageCount = function () { return n; };
    api.getOrientation = function () { return 'portrait'; };
    api.update = size;
    api.on = function (ev, cb) { (h[ev] = h[ev] || []).push(cb); };
    api.destroy = function () {
      dead = true; clearTimeout(mt);
      w.removeEventListener('resize', onResize);
      if (ro) ro.disconnect();
      container.innerHTML = '';
    };
    size(); layout();
  }
  w.SpellensePullStack = function (c, p, o) { return new Stack(c, p, o); };
})(window);
