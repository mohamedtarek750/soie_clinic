/* =====================================================================
   Soie Clinic — script.js
   Vanilla JavaScript. No libraries, no frameworks.
   Handles: loader, sticky nav, mobile menu, scroll-spy, scroll reveals,
   animated counters, hero parallax, custom cursor, booking modal,
   gallery filtering, lightbox, testimonials slider, back-to-top,
   footer year, live "open / closed" working-hours status, the FAQ
   accordion, and the booking page (doctor · service · date · time →
   pre-filled WhatsApp handoff). Every module guards for its elements,
   so the same file is shared safely across all pages of the site.
   All motion respects the user's prefers-reduced-motion setting.
   ===================================================================== */
(function () {
  'use strict';

  /* ---------- tiny helpers ---------- */
  var $  = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };
  var mq = function (q) {
    try { return !!(window.matchMedia && window.matchMedia(q).matches); }
    catch (e) { return false; }
  };
  var reduceMotion = mq('(prefers-reduced-motion: reduce)');
  var finePointer  = mq('(hover: hover) and (pointer: fine)');
  var raf = window.requestAnimationFrame
    ? window.requestAnimationFrame.bind(window)
    : function (fn) { return window.setTimeout(function () { fn(Date.now()); }, 16); };

  var on = function (el, evt, fn, opts) { if (el) el.addEventListener(evt, fn, opts || false); };

  function ready(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn);
    } else { fn(); }
  }

  /* =====================================================================
     1. LOADER — reveal the page once everything is in
     ===================================================================== */
  function initLoader() {
    var loader = $('#loader');
    if (!loader) return;

    function done() {
      loader.classList.add('is-done');
      document.body.classList.remove('is-loading');
      // remove from the flow after the fade so it never traps focus
      window.setTimeout(function () {
        if (loader && loader.parentNode) loader.parentNode.removeChild(loader);
      }, 900);
    }

    if (reduceMotion) { done(); return; }

    // Give the gold-thread animation a beat, but never hang forever.
    var minVisible = 1400;
    var start = Date.now();
    window.addEventListener('load', function () {
      var wait = Math.max(0, minVisible - (Date.now() - start));
      window.setTimeout(done, wait);
    });
    // hard fallback in case 'load' is slow
    window.setTimeout(done, 4500);
  }

  /* =====================================================================
     2. STICKY NAV + MOBILE MENU + SCROLL-SPY
     ===================================================================== */
  function initNav() {
    var nav      = $('#nav');
    var burger   = $('#burger');
    var navLinks = $('#navLinks');
    var links    = $$('.nav__link');

    /* pages with a dark video hero need light nav ink + the cream logo
       while the bar is still transparent */
    var darkHero = !!$('.hero--video');
    var logoImg = nav ? $('.nav__logo img', nav) : null;
    if (darkHero && nav) nav.classList.add('nav--dark-hero');

    /* shrink / frost the bar after a little scroll */
    function onScroll() {
      if (!nav) return;
      var scrolled = window.scrollY > 24;
      nav.classList.toggle('is-scrolled', scrolled);
      if (darkHero && logoImg) {
        var wantCream = !scrolled && !document.body.classList.contains('menu-open');
        var src = wantCream ? 'assets/images/logo-cream.png' : 'assets/images/logo.png';
        if (logoImg.getAttribute('src') !== src) logoImg.setAttribute('src', src);
      }
    }
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    /* mobile burger */
    function closeMenu() {
      document.body.classList.remove('menu-open');
      if (burger) {
        burger.setAttribute('aria-expanded', 'false');
        burger.setAttribute('aria-label', 'Open menu');
      }
      onScroll(); // restore dark-hero logo state
    }
    function toggleMenu() {
      var open = document.body.classList.toggle('menu-open');
      if (burger) {
        burger.setAttribute('aria-expanded', open ? 'true' : 'false');
        burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      }
      onScroll(); // dark logo on the cream overlay, cream logo on the video
    }
    on(burger, 'click', toggleMenu);
    // close after tapping any link (mobile) and on Esc
    if (navLinks) {
      on(navLinks, 'click', function (e) {
        if (e.target.closest('.nav__link')) closeMenu();
      });
    }
    on(document, 'keydown', function (e) {
      if (e.key === 'Escape' && document.body.classList.contains('menu-open')) closeMenu();
    });

    /* scroll-spy: highlight the section currently in view */
    var sections = links
      .map(function (l) {
        var id = l.getAttribute('href');
        return id && id.charAt(0) === '#' ? document.getElementById(id.slice(1)) : null;
      })
      .filter(Boolean);

    if ('IntersectionObserver' in window && sections.length) {
      var spy = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          var id = en.target.id;
          links.forEach(function (l) {
            l.classList.toggle('is-active', l.getAttribute('href') === '#' + id);
          });
        });
      }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });
      sections.forEach(function (s) { spy.observe(s); });
    }
  }

  /* =====================================================================
     3. SCROLL REVEALS + gold-thread draw
     Elements with [data-reveal] fade/slide in. [data-reveal-delay="n"]
     gives an explicit order; otherwise we stagger siblings automatically.
     .thread-divider draws its gold line when it enters the viewport.
     ===================================================================== */
  function initReveals() {
    var revealEls = $$('[data-reveal]');
    var threads   = $$('.thread-divider, .hero__thread');

    if (reduceMotion || !('IntersectionObserver' in window)) {
      revealEls.forEach(function (el) { el.classList.add('is-in'); });
      threads.forEach(function (el) { el.classList.add('is-in'); });
      return;
    }

    // auto-stagger: index each element among its reveal siblings
    var groups = new Map();
    revealEls.forEach(function (el) {
      var parent = el.parentNode;
      var idx = groups.get(parent) || 0;
      if (!el.hasAttribute('data-reveal-delay')) {
        el.dataset._autodelay = idx;
      }
      groups.set(parent, idx + 1);
    });

    var io = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target;
        var step = el.hasAttribute('data-reveal-delay')
          ? parseInt(el.getAttribute('data-reveal-delay'), 10)
          : parseInt(el.dataset._autodelay || 0, 10);
        el.style.transitionDelay = (Math.min(step, 8) * 0.09) + 's';
        el.classList.add('is-in');
        obs.unobserve(el);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });
    revealEls.forEach(function (el) { io.observe(el); });

    var iot = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add('is-in');
        obs.unobserve(en.target);
      });
    }, { threshold: 0.35 });
    threads.forEach(function (el) { iot.observe(el); });
  }

  /* =====================================================================
     4. ANIMATED COUNTERS
     .stat__num[data-count] counts up when scrolled into view.
     Supports data-decimals, data-suffix, data-pad (zero-pad width).
     ===================================================================== */
  function initCounters() {
    var nums = $$('.stat__num[data-count]');
    if (!nums.length) return;

    function format(el, value) {
      var dec = parseInt(el.getAttribute('data-decimals') || '0', 10);
      var pad = parseInt(el.getAttribute('data-pad') || '0', 10);
      var suf = el.getAttribute('data-suffix') || '';
      var out = dec > 0 ? value.toFixed(dec) : String(Math.round(value));
      if (pad > 0) {
        var intPart = out.split('.')[0];
        while (intPart.length < pad) { intPart = '0' + intPart; }
        out = dec > 0 ? intPart + out.slice(out.indexOf('.')) : intPart;
      }
      return out + suf;
    }

    function run(el) {
      var target = parseFloat(el.getAttribute('data-count')) || 0;
      if (reduceMotion) { el.textContent = format(el, target); return; }
      var dur = 1600, t0 = null;
      function tick(ts) {
        if (t0 === null) t0 = ts;
        var p = Math.min(1, (ts - t0) / dur);
        var eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
        el.textContent = format(el, target * eased);
        if (p < 1) raf(tick);
        else el.textContent = format(el, target);
      }
      raf(tick);
    }

    if (!('IntersectionObserver' in window)) { nums.forEach(run); return; }
    var io = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        run(en.target);
        obs.unobserve(en.target);
      });
    }, { threshold: 0.6 });
    nums.forEach(function (el) {
      el.textContent = format(el, 0); // markup holds the final value for no-JS; reset before animating
      io.observe(el);
    });
  }

  /* =====================================================================
     4b. HERO VIDEO — the muted ambient clinic reel behind the hero.
     It must play on every device (the OS "reduce animations" setting on
     some laptops used to strip it out, leaving a bare veil — never
     again). The element always stays in the DOM so its poster shows
     while loading or wherever autoplay is refused; first tap, click or
     key press retries playback for strict browsers.
     ===================================================================== */
  function initHeroVideo() {
    var v = $('.hero__video');
    if (!v) return;
    // the property (not just the attribute) is what autoplay policies check
    v.muted = true;
    v.setAttribute('muted', '');
    v.defaultMuted = true;

    function tryPlay() {
      var p = v.play && v.play();
      if (p && p.catch) p.catch(function () { /* poster keeps showing — fine */ });
    }
    on(document, 'touchstart', tryPlay, { once: true, passive: true });
    on(document, 'pointerdown', tryPlay, { once: true, passive: true });
    on(document, 'keydown', tryPlay, { once: true });
    on(v, 'canplay', tryPlay, { once: true });
    tryPlay();
  }

  /* =====================================================================
     5. HERO PARALLAX — subtle depth on [data-parallax] elements
     ===================================================================== */
  function initParallax() {
    if (reduceMotion) return;
    var els = $$('[data-parallax]');
    if (!els.length) return;

    var ticking = false;
    function update() {
      var y = window.scrollY;
      els.forEach(function (el) {
        var f = parseFloat(el.getAttribute('data-parallax')) || 0;
        el.style.transform = 'translate3d(0,' + (y * f).toFixed(1) + 'px,0)';
      });
      ticking = false;
    }
    window.addEventListener('scroll', function () {
      if (!ticking) { raf(update); ticking = true; }
    }, { passive: true });
    update();
  }

  /* =====================================================================
     6. CUSTOM CURSOR — a gold dot + trailing ring (fine pointers only)
     ===================================================================== */
  function initCursor() {
    var dot  = $('#cursorDot');
    var ring = $('#cursorRing');
    if (!dot || !ring) return;
    if (!finePointer || reduceMotion) { return; } // keep native cursor on touch

    document.body.classList.add('cursor-on');

    var mx = window.innerWidth / 2, my = window.innerHeight / 2;
    var rx = mx, ry = my;

    on(document, 'mousemove', function (e) {
      mx = e.clientX; my = e.clientY;
      dot.style.transform = 'translate3d(' + mx + 'px,' + my + 'px,0)';
    });

    function loop() {
      rx += (mx - rx) * 0.18;
      ry += (my - ry) * 0.18;
      ring.style.transform = 'translate3d(' + rx + 'px,' + ry + 'px,0)';
      raf(loop);
    }
    raf(loop);

    // grow the ring over interactive things
    var hoverSel = 'a, button, .ba, .filter, .s-card, input, textarea, [data-open-booking]';
    on(document, 'mouseover', function (e) {
      if (e.target.closest(hoverSel)) ring.classList.add('is-hover');
    });
    on(document, 'mouseout', function (e) {
      if (e.target.closest(hoverSel)) ring.classList.remove('is-hover');
    });
    on(document, 'mouseleave', function () {
      dot.style.opacity = '0'; ring.style.opacity = '0';
    });
    on(document, 'mouseenter', function () {
      dot.style.opacity = ''; ring.style.opacity = '';
    });
  }

  /* =====================================================================
     7. BOOKING MODAL — opened by any [data-open-booking]
     ===================================================================== */
  function initModal() {
    var modal = $('#bookingModal');
    if (!modal) return;
    var lastFocus = null;

    function openModal() {
      lastFocus = document.activeElement;
      modal.classList.add('is-open');
      modal.setAttribute('aria-hidden', 'false');
      document.body.classList.add('modal-open');
      var focusable = modal.querySelector('a, button, [tabindex]');
      if (focusable) focusable.focus();
    }
    function closeModal() {
      modal.classList.remove('is-open');
      modal.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('modal-open');
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }

    $$('[data-open-booking]').forEach(function (btn) {
      on(btn, 'click', function (e) { e.preventDefault(); openModal(); });
    });
    $$('[data-close-booking]').forEach(function (btn) {
      on(btn, 'click', closeModal);
    });
    on(document, 'keydown', function (e) {
      if (e.key === 'Escape' && modal.classList.contains('is-open')) closeModal();
    });

    // simple focus trap while open
    on(modal, 'keydown', function (e) {
      if (e.key !== 'Tab' || !modal.classList.contains('is-open')) return;
      var f = $$('a, button, [tabindex]:not([tabindex="-1"])', modal)
        .filter(function (el) { return el.offsetParent !== null; });
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
  }

  /* =====================================================================
     8. GALLERY FILTER — .filter[data-filter] toggles .ba[data-cat]
     ===================================================================== */
  function initGalleryFilter() {
    var buttons = $$('.filter');
    var items   = $$('.ba');
    if (!buttons.length || !items.length) return;

    buttons.forEach(function (btn) {
      on(btn, 'click', function () {
        var cat = btn.getAttribute('data-filter');
        buttons.forEach(function (b) {
          var active = b === btn;
          b.classList.toggle('is-active', active);
          b.setAttribute('aria-pressed', active ? 'true' : 'false');
        });
        items.forEach(function (fig) {
          var show = cat === 'all' || fig.getAttribute('data-cat') === cat;
          fig.classList.toggle('is-hidden', !show);
        });
      });
    });
  }

  /* =====================================================================
     9. LIGHTBOX — click a before/after card to view it enlarged.
     Prev/Next step through whatever is currently visible.
     ===================================================================== */
  function initLightbox() {
    var box  = $('#lightbox');
    var img  = $('#lbImg');
    var cap  = $('#lbCap');
    if (!box || !img) return;
    var closeBtn = $('#lbClose');
    var prevBtn  = $('#lbPrev');
    var nextBtn  = $('#lbNext');
    var all = $$('.ba, .rv-shot'); // before/after cards + review screenshots
    var current = -1;
    var lastFocus = null;

    function visible() {
      return all.filter(function (f) { return !f.classList.contains('is-hidden'); });
    }
    function show(fig) {
      var pic = $('img', fig);
      var name = $('.ba__name', fig);
      if (!pic) return;
      img.setAttribute('src', pic.getAttribute('src'));
      img.setAttribute('alt', pic.getAttribute('alt') || '');
      if (cap) cap.textContent = name ? name.textContent : '';
    }
    function openAt(fig) {
      lastFocus = document.activeElement;
      var list = visible();
      current = list.indexOf(fig);
      show(fig);
      box.classList.add('is-open');
      box.setAttribute('aria-hidden', 'false');
      document.body.classList.add('modal-open');
      if (closeBtn) closeBtn.focus();
    }
    function close() {
      box.classList.remove('is-open');
      box.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('modal-open');
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }
    function step(dir) {
      var list = visible();
      if (!list.length) return;
      current = (current + dir + list.length) % list.length;
      show(list[current]);
    }

    all.forEach(function (fig) {
      fig.setAttribute('tabindex', '0');
      fig.setAttribute('role', 'button');
      on(fig, 'click', function () { openAt(fig); });
      on(fig, 'keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openAt(fig); }
      });
    });
    on(closeBtn, 'click', close);
    on(prevBtn, 'click', function () { step(-1); });
    on(nextBtn, 'click', function () { step(1); });
    on(box, 'click', function (e) { if (e.target === box) close(); }); // backdrop
    on(document, 'keydown', function (e) {
      if (!box.classList.contains('is-open')) return;
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowLeft') step(-1);
      else if (e.key === 'ArrowRight') step(1);
    });
  }

  /* =====================================================================
     10. TESTIMONIALS SLIDER — transform track, dots, auto-advance, swipe
     ===================================================================== */
  function initTestimonials() {
    var track = $('#tstTrack');
    if (!track) return;
    var cards = $$('.tst__card', track);
    if (cards.length < 2) return;
    var prev = $('#tstPrev');
    var next = $('#tstNext');
    var dotsWrap = $('#tstDots');
    var index = 0;
    var timer = null;
    var DELAY = 5600;

    // build dots
    var dots = [];
    if (dotsWrap) {
      cards.forEach(function (_, i) {
        var d = document.createElement('button');
        d.className = 'tst__dot';
        d.type = 'button';
        d.setAttribute('aria-label', 'Go to review ' + (i + 1));
        on(d, 'click', function () { go(i); reset(); });
        dotsWrap.appendChild(d);
        dots.push(d);
      });
    }

    function go(i) {
      index = (i + cards.length) % cards.length;
      track.style.transform = 'translateX(' + (-index * 100) + '%)';
      dots.forEach(function (d, di) { d.classList.toggle('is-active', di === index); });
    }
    function nextSlide() { go(index + 1); }
    function prevSlide() { go(index - 1); }

    function start() {
      if (reduceMotion) return;
      stop();
      timer = window.setInterval(nextSlide, DELAY);
    }
    function stop() { if (timer) { clearInterval(timer); timer = null; } }
    function reset() { stop(); start(); }

    on(next, 'click', function () { nextSlide(); reset(); });
    on(prev, 'click', function () { prevSlide(); reset(); });

    // pause on hover / focus
    var vp = $('.tst__viewport') || track.parentNode;
    on(vp, 'mouseenter', stop);
    on(vp, 'mouseleave', start);
    on(vp, 'focusin', stop);
    on(vp, 'focusout', start);

    // touch swipe
    var x0 = null;
    on(track, 'touchstart', function (e) { x0 = e.touches[0].clientX; stop(); }, { passive: true });
    on(track, 'touchend', function (e) {
      if (x0 === null) return;
      var dx = e.changedTouches[0].clientX - x0;
      if (Math.abs(dx) > 40) { dx < 0 ? nextSlide() : prevSlide(); }
      x0 = null; start();
    });

    // pause when the tab is hidden
    on(document, 'visibilitychange', function () {
      document.hidden ? stop() : start();
    });

    go(0);
    start();
  }

  /* =====================================================================
     10a. BEFORE/AFTER COMPARISON SLIDER — the hidden range input drives
     the --pos CSS var; drag, touch and arrow keys all come for free.
     ===================================================================== */
  function initCompare() {
    $$('.cmp').forEach(function (cmp) {
      var range = $('.cmp__range', cmp);
      if (!range) return;
      function apply() { cmp.style.setProperty('--pos', range.value + '%'); }
      on(range, 'input', apply);
      apply();
    });
  }

  /* =====================================================================
     10b. REVIEW STRIP — arrow buttons step the snap-scrolling screenshot
     strip by one card; native swipe/scroll works as-is.
     ===================================================================== */
  function initReviewStrip() {
    var strip = $('#rvStrip');
    if (!strip) return;
    function step(dir) {
      var card = $('.rv-shot', strip);
      var gap = 18;
      var w = card ? card.getBoundingClientRect().width + gap : 320;
      strip.scrollBy({ left: dir * w, behavior: reduceMotion ? 'auto' : 'smooth' });
    }
    on($('#rvPrev'), 'click', function () { step(-1); });
    on($('#rvNext'), 'click', function () { step(1); });
  }

  /* =====================================================================
     11. BACK-TO-TOP button
     ===================================================================== */
  function initToTop() {
    var btn = $('#toTop');
    if (!btn) return;
    function onScroll() {
      btn.classList.toggle('is-visible', window.scrollY > 600);
    }
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    on(btn, 'click', function () {
      window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    });
  }

  /* =====================================================================
     12. FOOTER YEAR
     ===================================================================== */
  function initYear() {
    var y = $('#year');
    if (y) y.textContent = String(new Date().getFullYear());
  }

  /* =====================================================================
     13. WORKING HOURS — highlight today + live open / closed status.
     We read today's row straight from the DOM so the status always
     matches whatever hours are shown (no duplicated data to keep in sync).
     ===================================================================== */
  function initHours() {
    var rows = $$('.hours__row');
    var statusEl = $('#openStatus');
    var textEl = $('#openStatusText');
    if (!rows.length) return;

    var now = new Date();
    var today = now.getDay();            // 0 = Sunday … 6 = Saturday
    var mins = now.getHours() * 60 + now.getMinutes();
    var todayRow = null;

    rows.forEach(function (row) {
      var d = parseInt(row.getAttribute('data-day'), 10);
      var isToday = d === today;
      row.classList.toggle('is-today', isToday);
      if (isToday) todayRow = row;
    });

    if (!statusEl || !textEl) return;

    function parseTime(str) {
      // expects e.g. "10:00 AM" -> minutes since midnight
      var m = str.trim().match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
      if (!m) return null;
      var h = parseInt(m[1], 10) % 12;
      var min = parseInt(m[2], 10);
      if (/PM/i.test(m[3])) h += 12;
      return h * 60 + min;
    }

    var open = false, opensAt = null;
    if (todayRow) {
      var timeEl = $('.hours__time', todayRow);
      if (timeEl) {
        var parts = timeEl.textContent.split(/\s+to\s+|[–—-]/); // "10:00 AM to 11:00 PM" (or legacy dash)
        if (parts.length === 2) {
          var start = parseTime(parts[0]);
          var end = parseTime(parts[1]);
          if (start !== null && end !== null) {
            open = mins >= start && mins < end;
            opensAt = start;
          }
        }
      }
    }

    statusEl.classList.remove('is-open', 'is-closed');
    if (open) {
      statusEl.classList.add('is-open');
      textEl.textContent = 'Open now';
    } else {
      statusEl.classList.add('is-closed');
      if (opensAt !== null && mins < opensAt && todayRow) {
        var h12 = Math.floor(opensAt / 60);
        var mm = opensAt % 60;
        var ampm = h12 >= 12 ? 'PM' : 'AM';
        var hh = h12 % 12; if (hh === 0) hh = 12;
        textEl.textContent = 'Closed · opens ' + hh + ':' + (mm < 10 ? '0' + mm : mm) + ' ' + ampm;
      } else {
        textEl.textContent = 'Closed now';
      }
    }
  }

  /* =====================================================================
     14. FAQ ACCORDION — native <details>; opening one closes its siblings
     so the list stays calm and scannable.
     ===================================================================== */
  function initAccordion() {
    $$('.acc').forEach(function (acc) {
      var items = $$('details', acc);
      items.forEach(function (d) {
        on(d, 'toggle', function () {
          if (!d.open) return;
          items.forEach(function (other) {
            if (other !== d) other.open = false;
          });
        });
      });
    });
  }

  /* =====================================================================
     15. BOOKING PAGE — doctor · service · date · time → WhatsApp handoff.
     No backend: the summary builds a pre-filled wa.me link per branch and
     the team confirms personally. Slots follow the clinic's working hours
     (Sat–Thu 10:00–23:00, Fri 12:00–22:00), hourly, last start 1h before
     close; past times are hidden when the chosen date is today.
     ===================================================================== */
  function initBooking() {
    var form = $('#bkForm');
    if (!form) return;

    var serviceSel = $('#bkService');
    var dateInput  = $('#bkDate');
    var slotsWrap  = $('#bkSlots');
    var submit     = $('#bkSubmit');
    var sum = {
      branch:  $('#sumBranch'),
      doctor:  $('#sumDoctor'),
      service: $('#sumService'),
      date:    $('#sumDate'),
      time:    $('#sumTime')
    };
    var selectedTime = '';

    function pad(n) { return n < 10 ? '0' + n : String(n); }
    function fmt12(h) {
      var ampm = h >= 12 ? 'PM' : 'AM';
      var hh = h % 12; if (hh === 0) hh = 12;
      return hh + ':00 ' + ampm;
    }

    // limit the calendar to today → +60 days
    var today = new Date();
    var max = new Date(today.getTime() + 60 * 24 * 3600 * 1000);
    if (dateInput) {
      dateInput.min = today.getFullYear() + '-' + pad(today.getMonth() + 1) + '-' + pad(today.getDate());
      dateInput.max = max.getFullYear() + '-' + pad(max.getMonth() + 1) + '-' + pad(max.getDate());
    }

    function checked(name) {
      var el = form.querySelector('input[name="' + name + '"]:checked');
      return el || null;
    }

    function prettyDate(val) {
      if (!val) return 'Not set';
      var parts = val.split('-');
      var d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      var days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
      var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      return days[d.getDay()] + ' ' + d.getDate() + ' ' + months[d.getMonth()] + ' ' + d.getFullYear();
    }

    function buildSlots() {
      if (!slotsWrap || !dateInput) return;
      selectedTime = '';
      slotsWrap.innerHTML = '';
      var val = dateInput.value;
      if (!val) {
        slotsWrap.innerHTML = '<p class="slots__hint">Choose a date first and the available times will appear here.</p>';
        update();
        return;
      }
      var parts = val.split('-');
      var d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      var friday = d.getDay() === 5;
      var open = friday ? 12 : 10;
      var close = friday ? 22 : 23;
      var now = new Date();
      var isToday = d.toDateString() === now.toDateString();
      var added = 0;
      for (var h = open; h < close; h++) {
        if (isToday && h <= now.getHours()) continue; // no past slots today
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'slot';
        b.textContent = fmt12(h);
        (function (btn) {
          on(btn, 'click', function () {
            $$('.slot', slotsWrap).forEach(function (s) { s.classList.remove('is-selected'); });
            btn.classList.add('is-selected');
            selectedTime = btn.textContent;
            update();
          });
        })(b);
        slotsWrap.appendChild(b);
        added++;
      }
      if (!added) {
        slotsWrap.innerHTML = '<p class="slots__hint">No more times today. Please pick the next day.</p>';
      }
      update();
    }

    function update() {
      var branchEl = checked('bkBranch');
      var doctorEl = checked('bkDoctor');
      var branch  = branchEl ? branchEl.value : 'New Cairo';
      var doctor  = doctorEl ? doctorEl.value : 'No preference';
      var service = serviceSel ? serviceSel.value : 'Consultation';
      var dateVal = dateInput ? dateInput.value : '';

      if (sum.branch)  sum.branch.textContent  = branch;
      if (sum.doctor)  sum.doctor.textContent  = doctor;
      if (sum.service) sum.service.textContent = service;
      if (sum.date)    sum.date.textContent    = prettyDate(dateVal);
      if (sum.time)    sum.time.textContent    = selectedTime || 'Not set';

      if (!submit) return;
      var ready = !!(dateVal && selectedTime);
      submit.setAttribute('aria-disabled', ready ? 'false' : 'true');
      if (ready) {
        var wa = branchEl ? branchEl.getAttribute('data-wa') : '201000033766';
        var msg = 'Hello Soie Clinic! I would like to book an appointment.\n'
                + '• Branch: ' + branch + '\n'
                + '• Doctor: ' + doctor + '\n'
                + '• Treatment: ' + service + '\n'
                + '• Date: ' + prettyDate(dateVal) + '\n'
                + '• Time: ' + selectedTime;
        submit.href = 'https://wa.me/' + wa + '?text=' + encodeURIComponent(msg);
      } else {
        submit.removeAttribute('href');
      }
    }

    // pre-select doctor / service passed from profile & treatment pages
    try {
      var params = new URLSearchParams(window.location.search);
      var docSlug = params.get('doctor');
      var svcSlug = params.get('service');
      if (docSlug) {
        var dr = form.querySelector('input[name="bkDoctor"][data-slug="' + docSlug + '"]');
        if (dr) dr.checked = true;
      }
      if (svcSlug && serviceSel) {
        var opt = serviceSel.querySelector('option[data-slug="' + svcSlug + '"]');
        if (opt) opt.selected = true;
      }
    } catch (e) { /* URLSearchParams unsupported — defaults stay */ }

    $$('input[name="bkBranch"], input[name="bkDoctor"]', form).forEach(function (r) {
      on(r, 'change', update);
    });
    on(serviceSel, 'change', update);
    on(dateInput, 'change', buildSlots);
    // block navigation while incomplete
    on(submit, 'click', function (e) {
      if (submit.getAttribute('aria-disabled') === 'true') e.preventDefault();
    });

    update();
  }

  /* =====================================================================
     BOOT
     ===================================================================== */
  function safe(fn, name) {
    try { fn(); }
    catch (e) {
      if (window.console && console.warn) console.warn('Soie: "' + name + '" failed —', e);
    }
  }

  safe(initLoader, 'loader'); // start immediately so the fade feels responsive
  ready(function () {
    safe(initNav, 'nav');
    safe(initReveals, 'reveals');
    safe(initCounters, 'counters');
    safe(initHeroVideo, 'hero video');
    safe(initParallax, 'parallax');
    safe(initCursor, 'cursor');
    safe(initModal, 'modal');
    safe(initGalleryFilter, 'gallery filter');
    safe(initLightbox, 'lightbox');
    safe(initTestimonials, 'testimonials');
    safe(initReviewStrip, 'review strip');
    safe(initCompare, 'compare slider');
    safe(initToTop, 'to-top');
    safe(initYear, 'year');
    safe(initHours, 'hours');
    safe(initAccordion, 'accordion');
    safe(initBooking, 'booking');
  });
})();
