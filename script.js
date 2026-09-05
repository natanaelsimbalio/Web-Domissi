/* =========================================================
   DOMISSI HERMANOS — Interacción
   Única dependencia externa: Lenis (scroll suave), vendorizada
   en assets/js/lenis.min.js. Todo lo demás degrada con
   elegancia si algo falla.
   ========================================================= */
(function () {
  'use strict';

  document.documentElement.classList.add('js');

  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* -------------------------------------------------------
     Año del footer
  ------------------------------------------------------- */
  var year = $('#year');
  if (year) year.textContent = new Date().getFullYear();

  /* -------------------------------------------------------
     Lenis: scroll suave sobre toda la página.
     Si la librería no cargó (CDN caído, bloqueada), el scroll
     nativo del navegador sigue funcionando sin esta capa.
  ------------------------------------------------------- */
  var lenis = null;
  if (!reduced && typeof window.Lenis === 'function') {
    lenis = new window.Lenis({
      duration: 1.05,
      easing: function (t) { return 1 - Math.pow(1 - t, 3); },
      smoothWheel: true
    });

    var raf = function (time) {
      lenis.raf(time);
      window.requestAnimationFrame(raf);
    };
    window.requestAnimationFrame(raf);

    // Los enlaces #ancla usan el scrollTo de Lenis para que el
    // salto sea igual de suave que el resto del recorrido.
    $$('a[href^="#"]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        var id = a.getAttribute('href');
        if (id.length < 2) return;
        var target = document.querySelector(id);
        if (!target) return;
        e.preventDefault();
        lenis.scrollTo(target, { offset: -18, duration: 1.1 });
      });
    });
  }

  /* -------------------------------------------------------
     Header flotante: se oculta al bajar, reaparece al subir.
     Nunca se esconde arriba del todo ni con el menú abierto.
  ------------------------------------------------------- */
  var head = $('#head');
  if (head) {
    var lastY = window.scrollY;
    var menuOpen = false;

    var onScroll = function (y) {
      if (menuOpen) return;
      var goingDown = y > lastY + 4;
      var goingUp = y < lastY - 4;

      if (y < 80) {
        head.classList.remove('is-hidden');
      } else if (goingDown) {
        head.classList.add('is-hidden');
      } else if (goingUp) {
        head.classList.remove('is-hidden');
      }
      lastY = y;
    };

    if (lenis) {
      lenis.on('scroll', function (e) { onScroll(e.scroll); });
    } else {
      window.addEventListener('scroll', function () { onScroll(window.scrollY); }, { passive: true });
    }
  }

  /* -------------------------------------------------------
     Menú móvil
  ------------------------------------------------------- */
  var burger = $('#burger');
  var navMobile = $('#navMobile');

  if (burger && navMobile) {
    var setMenu = function (open) {
      navMobile.classList.toggle('is-open', open);
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
      document.body.style.overflow = open ? 'hidden' : '';
      if (typeof menuOpen !== 'undefined') menuOpen = open;
      if (lenis) { if (open) lenis.stop(); else lenis.start(); }
    };

    burger.addEventListener('click', function () {
      setMenu(burger.getAttribute('aria-expanded') !== 'true');
    });

    navMobile.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') setMenu(false);
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && navMobile.classList.contains('is-open')) {
        setMenu(false);
        burger.focus();
      }
    });

    window.addEventListener('resize', function () {
      if (window.innerWidth >= 860) setMenu(false);
    });
  }

  /* -------------------------------------------------------
     Navegación activa según la sección visible
  ------------------------------------------------------- */
  var navLinks = $$('.nav a[href^="#"], .nav-mobile a[href^="#"]');

  if (navLinks.length && 'IntersectionObserver' in window) {
    var sectionIds = [];
    navLinks.forEach(function (a) {
      var id = a.getAttribute('href').slice(1);
      if (sectionIds.indexOf(id) === -1) sectionIds.push(id);
    });
    var sections = sectionIds.map(function (id) { return document.getElementById(id); }).filter(Boolean);

    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        navLinks.forEach(function (a) {
          a.classList.toggle('is-active', a.getAttribute('href') === '#' + entry.target.id);
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });

    sections.forEach(function (s) { spy.observe(s); });
  }

  /* -------------------------------------------------------
     Catálogo: búsqueda en vivo
     Los 21 productos viven agrupados en familias (.cat-group).
     La búsqueda filtra los items y oculta el grupo entero
     cuando ninguno de sus items matchea.
  ------------------------------------------------------- */
  var input  = $('#q');
  var clear  = $('#qClear');
  var groups = $$('.cat-group');
  var items  = $$('.cat-item');
  var count  = $('#count');
  var empty  = $('#empty');
  var TOTAL  = items.length;

  var normalize = function (str) {
    return str
      .toLowerCase()
      .normalize('NFD')
      .replace(new RegExp('[\u0300-\u036f]', 'g'), ''); // ignora tildes: angulo encuentra Angulos
  };

  var render = function () {
    var term = input ? normalize(input.value.trim()) : '';
    var visible = 0;

    groups.forEach(function (group) {
      var groupItems = $$('.cat-item', group);
      var groupHits = 0;

      groupItems.forEach(function (item) {
        var haystack = normalize(item.dataset.name + ' ' + item.textContent);
        var show = term === '' || haystack.indexOf(term) !== -1;
        item.hidden = !show;
        item.classList.remove('is-hit');
        if (show) { groupHits++; visible++; }
      });

      group.hidden = groupHits === 0;
    });

    if (count) {
      count.textContent = visible === TOTAL
        ? TOTAL + ' familias de producto'
        : visible + ' de ' + TOTAL + ' familias';
    }
    if (empty) empty.hidden = visible !== 0;
    if (clear) clear.hidden = !input || input.value === '';
  };

  if (input) input.addEventListener('input', render);

  if (clear && input) {
    clear.addEventListener('click', function () {
      input.value = '';
      render();
      input.focus();
    });
  }

  if (items.length) render();

  /* -------------------------------------------------------
     Chips de producto: saltan al catálogo y resaltan el item
  ------------------------------------------------------- */
  $$('[data-jump]').forEach(function (link) {
    link.addEventListener('click', function () {
      if (input && input.value) { input.value = ''; render(); }

      var target = link.dataset.jump;
      var group = groups.filter(function (g) { return g.dataset.group === target; })[0];
      if (!group) return;

      var firstItem = $('.cat-item', group);
      if (firstItem) {
        firstItem.classList.add('is-hit');
        window.setTimeout(function () { firstItem.classList.remove('is-hit'); }, 2200);
      }
    });
  });

  /* -------------------------------------------------------
     Formulario de presupuesto
     No hay backend: se arma el mensaje y se abre WhatsApp.
  ------------------------------------------------------- */
  var form = $('#form');
  var WHATSAPP = '5493464609089';

  if (form) {
    var showError = function (field, message) {
      var wrap = field.closest('.field');
      var slot = wrap ? $('.err', wrap) : null;
      if (wrap) wrap.classList.toggle('has-error', Boolean(message));
      if (slot) slot.textContent = message || '';
      field.setAttribute('aria-invalid', message ? 'true' : 'false');
    };

    var validate = function (field) {
      var value = field.value.trim();
      if (!field.required) return true;

      if (value === '') {
        showError(field, 'Completá este campo.');
        return false;
      }
      if (field.type === 'tel' && value.replace(/\D/g, '').length < 8) {
        showError(field, 'Ingresá un teléfono con característica.');
        return false;
      }
      showError(field, '');
      return true;
    };

    $$('input, textarea', form).forEach(function (field) {
      field.addEventListener('blur', function () { validate(field); });
      field.addEventListener('input', function () {
        if (field.closest('.field').classList.contains('has-error')) validate(field);
      });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      var required = $$('[required]', form);
      var ok = true;
      required.forEach(function (field) { if (!validate(field)) ok = false; });

      if (!ok) {
        var first = $('.has-error input, .has-error textarea', form);
        if (first) first.focus();
        return;
      }

      var get = function (name) {
        var el = form.elements[name];
        return el ? el.value.trim() : '';
      };

      var lines = [
        'Hola, quiero pedir un presupuesto.',
        '',
        'Nombre: ' + get('nombre'),
        'Teléfono: ' + get('telefono')
      ];

      if (get('localidad')) lines.push('Localidad: ' + get('localidad'));
      lines.push('Destino: ' + get('rubro'));
      lines.push('');
      lines.push('Material que necesito:');
      lines.push(get('detalle'));

      window.open(
        'https://wa.me/' + WHATSAPP + '?text=' + encodeURIComponent(lines.join('\n')),
        '_blank',
        'noopener'
      );
    });
  }

  /* -------------------------------------------------------
     Aparición al hacer scroll
     Los elementos ya son visibles por CSS; esto solo suaviza.
  ------------------------------------------------------- */
  if (!reduced && 'IntersectionObserver' in window) {
    var targets = $$('.path, .cat-group, .value, .wholesale__text, .wholesale__img, .quote__aside, .quote__form');
    targets.forEach(function (el) { el.classList.add('reveal'); });

    var io = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        obs.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });

    targets.forEach(function (el) { io.observe(el); });
  }

})();
