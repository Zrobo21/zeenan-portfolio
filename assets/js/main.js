document.addEventListener('DOMContentLoaded', function () {
  // Auto-detect the site's base path (e.g. "/zeenan-portfolio") so asset
  // paths work correctly whether the site is hosted at the domain root or
  // in a subfolder like GitHub Project Pages.
  var BASE_PATH = (function () {
    var linkEl = document.querySelector('link[href*="/assets/css/main.css"]');
    if (linkEl) {
      var href = linkEl.getAttribute('href');
      var idx = href.indexOf('/assets/css/main.css');
      if (idx > -1) return href.substring(0, idx);
    }
    return '';
  })();

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

  /* ---------- AI ASSISTANT BOT ---------- */
  (function () {
    var introBubble = document.getElementById('botIntroBubble');
    var avatarBtn = document.getElementById('botAvatarBtn');
    var chatWindow = document.getElementById('botChatWindow');
    var chatClose = document.getElementById('botChatClose');
    var chatMessages = document.getElementById('botChatMessages');
    var chatInput = document.getElementById('botChatInput');
    var chatSend = document.getElementById('botChatSend');

    if (!avatarBtn || !chatWindow) return; // widget not on this page

    var KNOWLEDGE_URL = BASE_PATH + '/assets/data/bot-knowledge.json';
    var knowledge = null;
    var hasGreeted = false;
    var closingMessages = [
      "Don't hesitate to reach out if anything else comes up — I'm here for you! 🙌",
      "That's all from me for now — feel free to come back anytime you need something!",
      "Glad I could help! Zeenan and I are always just a message away.",
      "Take care, and don't hesitate to ask if you think of anything else!"
    ];

    // Show the intro speech bubble a couple seconds after page load.
    setTimeout(function () {
      if (introBubble) introBubble.classList.add('show');
    }, 1800);
    // Auto-hide the bubble after a while if nobody interacts with it.
    setTimeout(function () {
      if (introBubble && !chatWindow.classList.contains('open')) {
        introBubble.classList.remove('show');
      }
    }, 9000);

    function openChat() {
      chatWindow.classList.add('open');
      if (introBubble) introBubble.classList.remove('show');
      if (!hasGreeted) {
        addBotMessage("Hey! I'm Zeenan's assistant. Ask me about services, certifications, pricing, or how to book a consultation — or I can take you straight to a section of the site.");
        hasGreeted = true;
      }
      chatInput.focus();
      playSound('notify');
    }

    function closeChat() {
      chatWindow.classList.remove('open');
    }

    if (introBubble) introBubble.addEventListener('click', openChat);
    avatarBtn.addEventListener('click', function () {
      if (chatWindow.classList.contains('open')) {
        closeChat();
      } else {
        openChat();
      }
    });
    if (chatClose) chatClose.addEventListener('click', closeChat);

    function addMessage(text, sender) {
      var msg = document.createElement('div');
      msg.className = 'bot-msg ' + (sender === 'user' ? 'bot-msg-user' : 'bot-msg-bot');
      msg.innerHTML = text;
      chatMessages.appendChild(msg);
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    function addBotMessage(text) { addMessage(text, 'bot'); playSound('notify'); }
    function addUserMessage(text) { addMessage(text, 'user'); }

    function loadKnowledge(callback) {
      if (knowledge) { callback(knowledge); return; }
      fetch(KNOWLEDGE_URL)
        .then(function (res) { return res.json(); })
        .then(function (data) { knowledge = data; callback(data); })
        .catch(function () {
          callback(null);
        });
    }

    // Section-navigation shortcuts recognized directly, before falling back
    // to the knowledge base — lets the bot actually scroll the visitor there.
    var NAV_SHORTCUTS = [
      { keywords: ['book', 'appointment', 'schedule', 'consultation form'], targetId: 'appointment', label: 'the appointment form' },
      { keywords: ['contact', 'email you', 'reach you'], targetId: 'contact', label: 'the contact section' },
      { keywords: ['service', 'what do you offer'], targetId: 'services', label: 'the services section' },
      { keywords: ['certificat', 'credential', 'nsda'], targetId: 'certifications', label: 'the certifications section' },
      { keywords: ['project', 'keyword sample', 'case stud'], targetId: 'projects', label: 'the projects section' },
      { keywords: ['blog', 'article', 'read more'], targetId: null, label: 'the blog', url: '/blog/' }
    ];

    function tryNavigate(question) {
      var q = question.toLowerCase();
      for (var i = 0; i < NAV_SHORTCUTS.length; i++) {
        var shortcut = NAV_SHORTCUTS[i];
        for (var j = 0; j < shortcut.keywords.length; j++) {
          if (q.indexOf(shortcut.keywords[j]) !== -1) {
            return shortcut;
          }
        }
      }
      return null;
    }

    function findAnswer(question, data) {
      var q = question.toLowerCase();
      var bestMatch = null;
      var bestScore = 0;
      Object.keys(data).forEach(function (key) {
        if (key === '_readme') return;
        var entry = data[key];
        if (!entry.keywords) return;
        var score = 0;
        entry.keywords.forEach(function (kw) {
          if (q.indexOf(kw.toLowerCase()) !== -1) score += kw.length; // longer matches weigh more
        });
        if (score > bestScore) {
          bestScore = score;
          bestMatch = entry.answer;
        }
      });
      return bestMatch;
    }

    function handleUserQuestion(question) {
      addUserMessage(question);

      var navMatch = tryNavigate(question);
      if (navMatch) {
        setTimeout(function () {
          addBotMessage("On it — taking you to " + navMatch.label + " now!");
          setTimeout(function () {
            if (navMatch.url) {
              window.location.href = BASE_PATH + navMatch.url;
            } else {
              closeChat();
              var target = document.getElementById(navMatch.targetId);
              if (target) target.scrollIntoView({ behavior: 'smooth' });
            }
          }, 700);
        }, 400);
        return;
      }

      loadKnowledge(function (data) {
        if (!data) {
          setTimeout(function () {
            addBotMessage("I'm having trouble reaching my knowledge base right now — try the contact section to reach Zeenan directly!");
          }, 400);
          return;
        }
        var answer = findAnswer(question, data);
        setTimeout(function () {
          if (answer) {
            addBotMessage(answer);
          } else {
            addBotMessage("I don't have a specific answer for that, but Zeenan can help directly — want me to take you to the contact section, or would you like to book a consultation?");
          }
          // Occasionally close out with a warm sign-off after a real answer.
          if (answer && Math.random() < 0.3) {
            setTimeout(function () {
              var closing = closingMessages[Math.floor(Math.random() * closingMessages.length)];
              addBotMessage(closing);
            }, 1600);
          }
        }, 500);
      });
    }

    function submitQuestion() {
      var value = chatInput.value.trim();
      if (!value) return;
      chatInput.value = '';
      handleUserQuestion(value);
    }

    chatSend.addEventListener('click', submitQuestion);
    chatInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') submitQuestion();
    });
  })();

  /* ---------- SOUND SYSTEM ---------- */
  /* Drop click.mp3, hover.mp3, notify.mp3 into /assets/sounds/ and these
     will start playing automatically — no code changes needed. If the files
     aren't there yet, this fails silently and the site works exactly the
     same without sound. */
  var soundEnabled = localStorage.getItem('zeenan_sound') !== 'off';
  var sounds = {};
  ['click', 'hover', 'notify'].forEach(function (name) {
    var audio = new Audio(BASE_PATH + '/assets/sounds/' + name + '.mp3');
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

