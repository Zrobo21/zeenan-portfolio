document.addEventListener('DOMContentLoaded', function () {
  var toggle = document.querySelector('.nav-toggle');
  var links = document.querySelector('.nav-links');
  if (toggle && links) {
    toggle.addEventListener('click', function () {
      links.classList.toggle('open');
    });
    links.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () { links.classList.remove('open'); });
    });
  }

  /* ---------- DAY / NIGHT MODE ---------- */
  /* Defaults to night mode (the site's native GTA look). Preference is
     remembered per-device via localStorage. */
  var themeToggleBtn = document.getElementById('themeToggle');
  function applyTheme(theme) {
    if (theme === 'day') {
      document.documentElement.setAttribute('data-theme', 'day');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
    if (themeToggleBtn) {
      themeToggleBtn.textContent = theme === 'day' ? '☀️' : '🌙';
    }
  }
  var savedTheme = localStorage.getItem('zeenan_theme') || 'night';
  applyTheme(savedTheme);
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', function () {
      var current = localStorage.getItem('zeenan_theme') || 'night';
      var next = current === 'day' ? 'night' : 'day';
      localStorage.setItem('zeenan_theme', next);
      applyTheme(next);
      playSound('click');
    });
  }

  /* ---------- APPOINTMENT FORM -> GOOGLE SHEETS ---------- */
  /* This submits to a Google Form in the background (via a hidden iframe,
     since Google Forms doesn't allow direct fetch/CORS responses) so every
     submission lands automatically in the connected Google Sheet. The
     visitor never sees Google's own form UI — only this site's design.

     SETUP REQUIRED: replace GOOGLE_FORM_ACTION_URL and the entry.XXXX field
     IDs below with your real Google Form's values. See README.md for the
     exact steps to get these. Until this is filled in, the form will show
     a friendly error instead of silently failing. */
  var GOOGLE_FORM_ACTION_URL = "https://docs.google.com/forms/d/e/1FAIpQLSddZp0D-eEMy6Px83uynLojy2w_Bn0nIAc3XXOMH3tFTWCc0w/formResponse";
  var GOOGLE_FORM_FIELDS = {
    name: "entry.1493866852",
    phone: "entry.814744908",
    email: "entry.1306844477",
    purpose: "entry.2097373632",
    goal: "entry.2144171615"
  };

  var appointmentForm = document.getElementById('appointmentForm');
  var aptSubmitBtn = document.getElementById('aptSubmitBtn');
  var aptFormStatus = document.getElementById('aptFormStatus');

  if (appointmentForm) {
    appointmentForm.addEventListener('submit', function (e) {
      e.preventDefault();

      var isConfigured = GOOGLE_FORM_ACTION_URL && GOOGLE_FORM_FIELDS.name;
      if (!isConfigured) {
        aptFormStatus.textContent = 'Form setup pending — please contact Zeenan directly via WhatsApp for now.';
        aptFormStatus.className = 'form-status error';
        return;
      }

      var formData = {
        name: document.getElementById('apt-name').value,
        phone: document.getElementById('apt-phone').value,
        email: document.getElementById('apt-email').value,
        purpose: document.getElementById('apt-purpose').value,
        goal: document.getElementById('apt-goal').value
      };

      // Build a hidden iframe + form to POST to Google Forms without
      // navigating away or needing CORS (Google Forms blocks fetch(), but
      // a classic form POST to a hidden iframe works reliably).
      var iframeName = 'hidden-submit-frame';
      var iframe = document.getElementById(iframeName);
      if (!iframe) {
        iframe = document.createElement('iframe');
        iframe.name = iframeName;
        iframe.id = iframeName;
        iframe.style.display = 'none';
        document.body.appendChild(iframe);
      }

      var hiddenForm = document.createElement('form');
      hiddenForm.action = GOOGLE_FORM_ACTION_URL;
      hiddenForm.method = 'POST';
      hiddenForm.target = iframeName;

      Object.keys(formData).forEach(function (key) {
        var entryId = GOOGLE_FORM_FIELDS[key];
        if (!entryId) return;
        var input = document.createElement('input');
        input.type = 'hidden';
        input.name = entryId;
        input.value = formData[key];
        hiddenForm.appendChild(input);
      });

      document.body.appendChild(hiddenForm);
      hiddenForm.submit();
      document.body.removeChild(hiddenForm);

      aptSubmitBtn.disabled = true;
      aptSubmitBtn.textContent = 'Submitting...';

      setTimeout(function () {
        aptFormStatus.textContent = '✓ Application received — thank you! Zeenan will reach out soon.';
        aptFormStatus.className = 'form-status success';
        aptSubmitBtn.disabled = false;
        aptSubmitBtn.textContent = 'Submit Application';
        appointmentForm.reset();
        playSound('notify');
      }, 900);
    });
  }

  /* ---------- SOUND SYSTEM ---------- */
  /* Drop click.mp3, hover.mp3, notify.mp3 into /assets/sounds/ and these
     will start playing automatically — no code changes needed. If the files
     aren't there yet, this fails silently and the site works exactly the
     same without sound. */
  var soundEnabled = localStorage.getItem('zeenan_sound') !== 'off';
  var sounds = {};
  ['click', 'hover', 'notify'].forEach(function (name) {
    var audio = new Audio('/assets/sounds/' + name + '.mp3');
    audio.volume = name === 'hover' ? 0.15 : 0.35;
    audio.preload = 'auto';
    sounds[name] = audio;
  });

  var soundToggleBtn = document.getElementById('soundToggle');
  function updateToggleUI() {
    if (!soundToggleBtn) return;
    soundToggleBtn.textContent = soundEnabled ? '🔊' : '🔇';
    soundToggleBtn.classList.toggle('muted', !soundEnabled);
  }
  updateToggleUI();
  if (soundToggleBtn) {
    soundToggleBtn.addEventListener('click', function () {
      soundEnabled = !soundEnabled;
      localStorage.setItem('zeenan_sound', soundEnabled ? 'on' : 'off');
      updateToggleUI();
      if (soundEnabled) playSound('click');
    });
  }

  function playSound(name) {
    if (!soundEnabled || !sounds[name]) return;
    try {
      var clone = sounds[name].cloneNode();
      clone.volume = sounds[name].volume;
      clone.play().catch(function () { /* file missing or autoplay blocked — ignore */ });
    } catch (e) { /* ignore */ }
  }

  // Click sound on buttons and nav links
  document.querySelectorAll('.btn, .nav-links a, .mission-card, .cert-card a').forEach(function (el) {
    el.addEventListener('click', function () { playSound('click'); });
  });

  // Soft hover sound on nav links and cards (throttled so it's not annoying)
  var lastHover = 0;
  document.querySelectorAll('.nav-links a, .mission-card, .cert-card, .gallery-item').forEach(function (el) {
    el.addEventListener('mouseenter', function () {
      var now = Date.now();
      if (now - lastHover > 400) {
        playSound('hover');
        lastHover = now;
      }
    });
  });

  /* ---------- SCROLL REVEAL ANIMATIONS ---------- */
  var revealTargets = document.querySelectorAll(
    '.section-head, .about-grid, .skill-cell, .mission-card, .cert-card, ' +
    '.gallery-item, .post-row, .contact-box'
  );
  revealTargets.forEach(function (el) { el.classList.add('js-reveal'); });

  var skillCells = document.querySelectorAll('.skill-cell');
  skillCells.forEach(function (cell) {
    var fill = cell.querySelector('.skill-fill');
    if (fill) {
      cell.style.setProperty('--fill-width', fill.style.width || '80%');
    }
  });

  if ('IntersectionObserver' in window) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          if (entry.target.classList.contains('section-head')) {
            playSound('notify');
          }
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });

    revealTargets.forEach(function (el) { observer.observe(el); });
  } else {
    // Fallback: no IntersectionObserver support, just show everything.
    revealTargets.forEach(function (el) { el.classList.add('in-view'); });
  }
});

