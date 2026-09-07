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
    link: "entry.13948145",
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

      var countryCode = document.getElementById('apt-country-code').value;
      var phoneNumber = document.getElementById('apt-phone').value.trim();
      var formData = {
        name: document.getElementById('apt-name').value,
        phone: countryCode + ' ' + phoneNumber,
        email: document.getElementById('apt-email').value,
        purpose: document.getElementById('apt-purpose').value,
        link: document.getElementById('apt-link').value,
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
    var KNOWLEDGE_URL_BN = BASE_PATH + '/assets/data/bot-knowledge-bn.json';
    var knowledge = null;
    var knowledgeBn = null;
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
        setTimeout(function () {
          addBotMessage("💬 Feel comfortable typing in your own language — we respect every language, and I'll do my best to reply in it too.");
        }, 900);
        hasGreeted = true;
      }
      chatInput.focus();
      playSound('notify');
    }

    function closeChat() {
      chatWindow.classList.remove('open');
    }

    if (introBubble) introBubble.addEventListener('click', openChat);

    // --- Draggable widget ---
    // Lets the visitor reposition the bot anywhere on screen. A short drag
    // (below the threshold) is still treated as a click/tap to open the chat.
    var widget = document.querySelector('.bot-widget');
    var isDragging = false;
    var dragMoved = false;
    var startX, startY, startRight, startBottom;
    var DRAG_THRESHOLD = 6; // px of movement before it counts as a drag, not a tap

    function clampPosition(right, bottom) {
      var margin = 8;
      // Use the avatar button's own width/height, not the wrapping .bot-widget
      // container's — the container can be wider than the button because it
      // also holds the intro bubble/chat window as flex children, which
      // would otherwise let offsetWidth report a much bigger number than
      // the visible circular button and throw off the drag boundaries.
      var refWidth = avatarBtn.offsetWidth;
      var refHeight = widget.offsetHeight; // height is fine since avatar sits at the bottom
      var maxRight = window.innerWidth - refWidth - margin;
      var maxBottom = window.innerHeight - refHeight - margin;
      return {
        right: Math.min(Math.max(right, margin), Math.max(maxRight, margin)),
        bottom: Math.min(Math.max(bottom, margin), Math.max(maxBottom, margin))
      };
    }

    function onDragStart(clientX, clientY) {
      isDragging = true;
      dragMoved = false;
      startX = clientX;
      startY = clientY;
      var rect = avatarBtn.getBoundingClientRect();
      startRight = window.innerWidth - rect.right;
      startBottom = window.innerHeight - rect.bottom;
    }

    function onDragMove(clientX, clientY) {
      if (!isDragging) return;
      var dx = clientX - startX;
      var dy = clientY - startY;
      if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) {
        dragMoved = true;
      }
      if (dragMoved) {
        var next = clampPosition(startRight - dx, startBottom - dy);
        widget.style.right = next.right + 'px';
        widget.style.bottom = next.bottom + 'px';
      }
    }

    function onDragEnd() {
      isDragging = false;
    }

    avatarBtn.addEventListener('pointerdown', function (e) {
      onDragStart(e.clientX, e.clientY);
      avatarBtn.setPointerCapture && avatarBtn.setPointerCapture(e.pointerId);
    });
    avatarBtn.addEventListener('pointermove', function (e) {
      onDragMove(e.clientX, e.clientY);
    });
    avatarBtn.addEventListener('pointerup', function () {
      onDragEnd();
    });
    avatarBtn.addEventListener('pointercancel', onDragEnd);

    // Keep the widget on-screen if the window is resized/rotated.
    window.addEventListener('resize', function () {
      var rect = avatarBtn.getBoundingClientRect();
      var currentRight = window.innerWidth - rect.right;
      var currentBottom = window.innerHeight - rect.bottom;
      var next = clampPosition(currentRight, currentBottom);
      widget.style.right = next.right + 'px';
      widget.style.bottom = next.bottom + 'px';
    });

    avatarBtn.addEventListener('click', function () {
      if (dragMoved) {
        // This click was the tail end of a drag — don't also open the chat.
        dragMoved = false;
        return;
      }
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

    // Shows navigation as a clickable link inside the chat instead of
    // forcing an auto-scroll/auto-close. This keeps the conversation intact
    // (especially important mid-translation) and lets the visitor decide
    // when they're ready to move — fixes the jarring "chat suddenly closes
    // and yanks you to another section" behavior.
    function addNavPrompt(nav) {
      var msg = document.createElement('div');
      msg.className = 'bot-msg bot-msg-bot';
      var link = document.createElement('span');
      link.className = 'bot-msg-link';
      link.textContent = '→ Take me to ' + nav.label;
      link.addEventListener('click', function () {
        if (nav.url) {
          window.location.href = BASE_PATH + nav.url;
        } else {
          closeChat();
          var target = document.getElementById(nav.targetId);
          if (target) target.scrollIntoView({ behavior: 'smooth' });
        }
      });
      msg.appendChild(link);
      chatMessages.appendChild(msg);
      chatMessages.scrollTop = chatMessages.scrollHeight;
      playSound('notify');
    }

    function loadKnowledge(callback) {
      if (knowledge) { callback(knowledge); return; }
      fetch(KNOWLEDGE_URL)
        .then(function (res) { return res.json(); })
        .then(function (data) { knowledge = data; callback(data); })
        .catch(function () {
          callback(null);
        });
    }

    function loadKnowledgeBn(callback) {
      if (knowledgeBn) { callback(knowledgeBn); return; }
      fetch(KNOWLEDGE_URL_BN)
        .then(function (res) { return res.json(); })
        .then(function (data) { knowledgeBn = data; callback(data); })
        .catch(function () { callback(null); });
    }

    /* ---------- LANGUAGE DETECTION + FREE TRANSLATION ---------- */
    // Bangla is checked by Unicode script range, not word lists, since
    // Bangla script is unambiguous. English is assumed as the default/base
    // language for the main knowledge base and doesn't need detecting.
    function containsBanglaScript(text) {
      return /[\u0980-\u09FF]/.test(text);
    }

    // A visitor is treated as "using another language" when their message
    // has no Bangla script AND doesn't look like English (a rough check:
    // mostly non-ASCII letters, or matches common non-English Unicode
    // ranges for Chinese/Russian/Arabic/etc). This is a heuristic, not
    // perfect language ID — good enough to decide whether to attempt
    // translation at all.
    function looksNonEnglishNonBangla(text) {
      if (containsBanglaScript(text)) return false;
      var nonAsciiLetters = (text.match(/[^\x00-\x7F]/g) || []).length;
      var totalLetters = (text.match(/[a-zA-Z\u0080-\uFFFF]/g) || []).length;
      if (totalLetters === 0) return false;
      return (nonAsciiLetters / totalLetters) > 0.3;
    }

    // Last-resort fallback if the translate endpoint's detected-language
    // field can't be parsed for some reason: guess a language family from
    // the Unicode script actually used, purely so the reply can still be
    // translated into *something* reasonable rather than staying in English.
    function guessLangFromScript(text) {
      if (/[\u4E00-\u9FFF]/.test(text)) return 'zh-CN';   // Chinese
      if (/[\u0400-\u04FF]/.test(text)) return 'ru';       // Cyrillic (Russian etc.)
      if (/[\u0600-\u06FF]/.test(text)) return 'ar';       // Arabic
      if (/[\u3040-\u30FF]/.test(text)) return 'ja';       // Japanese kana
      if (/[\uAC00-\uD7AF]/.test(text)) return 'ko';       // Korean
      if (/[\u0900-\u097F]/.test(text)) return 'hi';       // Devanagari (Hindi)
      // Accented Latin letters common in French/Spanish/German/Portuguese —
      // default to French since that's what's been seen in testing, better
      // than falling back to plain English for a clearly non-English message.
      if (/[àâäéèêëîïôöùûüçñõáíóúÀÂÄÉÈÊËÎÏÔÖÙÛÜÇÑÕÁÍÓÚ]/.test(text)) return 'fr';
      return null;
    }

    // Uses Google's public (unofficial, key-free) translate endpoint. This
    // is not Google's documented Cloud Translation API -- it's the same
    // free endpoint translate.google.com's own webpage uses, called
    // directly. No key, no cost, but also no uptime guarantee, so every
    // call has a fallback that just shows the original text if it fails.
    // Returns { text, detectedLang } so a single call can both translate
    // and report what source language it detected.
    function freeTranslateFull(text, targetLang, sourceLang) {
      sourceLang = sourceLang || 'auto';
      var url = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=' +
        sourceLang + '&tl=' + targetLang + '&dt=t&q=' + encodeURIComponent(text);
      return fetch(url)
        .then(function (res) { return res.json(); })
        .then(function (data) {
          console.log('[bot-translate] raw response:', JSON.stringify(data).substring(0, 300));
          var translated = null;
          var detectedLang = null;
          if (data && data[0]) {
            translated = data[0].map(function (chunk) { return chunk[0]; }).join('');
          }
          // The detected source language has appeared at different indices
          // across versions of this unofficial endpoint. Check the common
          // ones defensively rather than assuming one fixed position.
          if (typeof data[2] === 'string') {
            detectedLang = data[2];
          } else if (typeof data[8] === 'object' && data[8] && data[8][0] && data[8][0][0]) {
            detectedLang = data[8][0][0];
          }
          console.log('[bot-translate] translated:', translated, '| detectedLang:', detectedLang);
          return { text: translated, detectedLang: detectedLang };
        })
        .catch(function (err) {
          console.log('[bot-translate] request failed:', err);
          return { text: null, detectedLang: null };
        });
    }

    function freeTranslate(text, targetLang, sourceLang) {
      return freeTranslateFull(text, targetLang, sourceLang).then(function (r) { return r.text; });
    }

    function detectLanguageCode(text) {
      return freeTranslateFull(text, 'en', 'auto').then(function (r) { return r.detectedLang; });
    }

    // Section-navigation shortcuts recognized directly, before falling back
    // to the knowledge base — lets the bot actually scroll the visitor there.
    var NAV_SHORTCUTS = [
      { keywords: ['book', 'appointment', 'schedule', 'consultation form', 'apply now', 'apply for'], targetId: 'appointment', label: 'the appointment form' },
      { keywords: ['contact', 'email you', 'reach you', 'phone number', 'whatsapp number'], targetId: 'contact', label: 'the contact section' },
      { keywords: ['service', 'what do you offer', 'what can zeenan do', 'take service', 'get service', 'hire zeenan', 'why should i', 'why choose', 'why hire'], targetId: 'services', label: 'the services section' },
      { keywords: ['certificat', 'credential', 'nsda', 'qualification'], targetId: 'certifications', label: 'the certifications section' },
      { keywords: ['project', 'keyword sample', 'case stud', 'past work', 'sample work'], targetId: 'projects', label: 'the projects section' },
      { keywords: ['blog', 'article', 'read more', 'learn seo'], targetId: null, label: 'the blog', url: '/blog/' }
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
      // Strip common punctuation so "help?" matches "help".
      var qClean = q.replace(/[?!.,]/g, ' ').replace(/\s+/g, ' ').trim();
      var qWords = qClean.split(' ').filter(function (w) { return w.length > 2; });

      var bestMatch = null;
      var bestScore = 0;

      Object.keys(data).forEach(function (key) {
        if (key === '_readme') return;
        var entry = data[key];
        if (!entry.keywords) return;

        var score = 0;
        entry.keywords.forEach(function (kwPhrase) {
          var kw = kwPhrase.toLowerCase();
          // Exact phrase match is the strongest signal.
          if (qClean.indexOf(kw) !== -1) {
            score += kw.length * 2;
            return;
          }
          // Otherwise score by how many of the keyword phrase's words
          // appear anywhere in the question — catches rephrased or
          // partial questions like "what can u help me do" matching
          // "what can you help".
          var kwWords = kw.split(' ').filter(function (w) { return w.length > 2; });
          if (kwWords.length === 0) return;
          var matchedWords = kwWords.filter(function (w) { return qWords.indexOf(w) !== -1; });
          if (matchedWords.length > 0) {
            score += (matchedWords.length / kwWords.length) * kw.length;
          }
        });

        if (score > bestScore) {
          bestScore = score;
          bestMatch = { answer: entry.answer, navigate: entry.navigate || null };
        }
      });

      // Require a minimum confidence so unrelated short questions don't
      // accidentally latch onto a weakly-related entry.
      return bestScore >= 4 ? bestMatch : null;
    }

    // Words that suggest a question is even loosely about this site's
    // domain (marketing, the business, or Zeenan). If a question matches
    // none of these AND finds no knowledge-base answer, it's treated as
    // off-topic and gets a polite decline instead of a generic "I don't know".
    var RELEVANCE_HINTS = [
      'seo', 'market', 'zeenan', 'service', 'price', 'cost', 'book', 'appoint',
      'contact', 'certif', 'nsda', 'keyword', 'blog', 'project', 'business',
      'website', 'content', 'social', 'consult', 'hire', 'client', 'help',
      'work', 'email', 'whatsapp', 'location', 'based', 'experience'
    ];

    function isLikelyOffTopic(question) {
      var q = question.toLowerCase();
      return !RELEVANCE_HINTS.some(function (hint) { return q.indexOf(hint) !== -1; });
    }

    function handleUserQuestion(rawQuestion) {
      addUserMessage(rawQuestion);

      if (containsBanglaScript(rawQuestion)) {
        // Bangla script detected — use the dedicated Bangla knowledge base
        // directly, no translation needed.
        loadKnowledgeBn(function (bnData) {
          setTimeout(function () {
            var match = bnData ? findAnswer(rawQuestion, bnData) : null;
            if (match) {
              respondWithMatch(match, null); // null = no translation, native Bangla answer
            } else {
              addBotMessage("দুঃখিত, এই প্রশ্নের নির্দিষ্ট উত্তর আমার কাছে নেই — Services, pricing, certifications, অথবা appointment নিয়ে জিজ্ঞেস করতে পারো।");
            }
          }, 500);
        });
        return;
      }

      if (looksNonEnglishNonBangla(rawQuestion)) {
        // Likely a different language entirely. One call both translates
        // the question to English AND reports the detected source language,
        // so the reply can be translated back into that same language. The
        // knowledge base itself is never modified — only what's shown here.
        freeTranslateFull(rawQuestion, 'en', 'auto').then(function (result) {
          var translatedQuestion = result.text;
          var langCode = result.detectedLang || guessLangFromScript(rawQuestion);

          if (!translatedQuestion) {
            // Translation service unreachable — fall back to English flow
            // as a best effort rather than leaving the visitor stuck.
            loadKnowledge(function (data) {
              var match = data ? findAnswer(rawQuestion, data) : null;
              setTimeout(function () { respondWithMatch(match, null, rawQuestion); }, 500);
            });
            return;
          }
          loadKnowledge(function (data) {
            var match = data ? findAnswer(translatedQuestion, data) : null;
            setTimeout(function () {
              respondWithMatch(match, langCode || null, translatedQuestion);
            }, 500);
          });
        });
        return;
      }

      // Default: English flow.
      loadKnowledge(function (data) {
        if (!data) {
          setTimeout(function () {
            addBotMessage("I'm having trouble reaching my knowledge base right now — try the contact section to reach Zeenan directly!");
          }, 400);
          return;
        }
        var match = findAnswer(rawQuestion, data);
        setTimeout(function () { respondWithMatch(match, null, rawQuestion); }, 500);
      });
    }

    // Shared responder: takes a {answer, navigate} match (or null), the
    // English-form question (for nav-shortcut fallback matching), and an
    // optional target language code to translate the OUTPUT into before
    // displaying. English/Bangla-native answers pass null (no translation).
    function respondWithMatch(match, translateToLang, englishQuestion) {
      function showText(text, isNav) {
        if (!translateToLang || translateToLang === 'en') {
          addBotMessage(text);
          return Promise.resolve();
        }
        return freeTranslate(text, translateToLang, 'en').then(function (translated) {
          addBotMessage(translated || text); // fall back to English if translation fails
        });
      }

      if (match) {
        showText(match.answer).then(function () {
          if (match.navigate) {
            setTimeout(function () {
              var nav = match.navigate;
              addNavPrompt(nav);
            }, 900);
          } else if (Math.random() < 0.3) {
            setTimeout(function () {
              var closing = closingMessages[Math.floor(Math.random() * closingMessages.length)];
              showText(closing);
            }, 1600);
          }
        });
      } else {
        var navMatch = tryNavigate(englishQuestion || '');
        var fallback;
        if (navMatch) {
          setTimeout(function () { addNavPrompt(navMatch); }, 300);
        } else if (isLikelyOffTopic(englishQuestion || '')) {
          fallback = "Sorry, that's outside what I can help with — I'm here for questions about Zeenan's services, pricing, certifications, or booking a consultation. Anything along those lines I can help with?";
          showText(fallback);
        } else {
          fallback = "I don't have a specific answer for that yet — try asking about services, pricing, certifications, or how to book a consultation. Or I can take you straight to the contact section if you'd like to ask Zeenan directly!";
          showText(fallback);
        }
      }
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

  // Soft hover sound on nav links and cards — desktop/mouse only.
  // Guarded so touch devices (phones/tablets) never trigger this, since
  // touch-scroll can sometimes fire hover-like events unexpectedly.
  var supportsHover = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (supportsHover) {
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
  }

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
          // Note: no sound plays here on purpose — a chime firing every
          // time a section scrolls into view (9+ times per scroll session)
          // was overwhelming. Sound stays reserved for clicks and the bot.
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

