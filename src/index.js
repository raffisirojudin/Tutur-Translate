/**
 * Tutur - Penerjemah Instan
 * Halaman web penerjemah real-time, didukung Groq API (super cepat, gratis).
 * Mendukung input ketik maupun suara (Web Speech API bawaan browser, gratis),
 * dan bisa membacakan hasil terjemahan otomatis.
 */

const GROQ_MODEL = "llama-3.1-8b-instant";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/login" && request.method === "POST") {
      return handleLogin(request, env);
    }
    if (url.pathname === "/api/translate" && request.method === "POST") {
      return handleTranslate(request, env);
    }

    return new Response(HTML_PAGE, {
      headers: { "Content-Type": "text/html; charset=UTF-8" },
    });
  },
};

async function handleLogin(request, env) {
  const { password } = await request.json();
  const appPassword = env.APP_PASSWORD;
  if (!appPassword) {
    return jsonResponse({ ok: true });
  }
  return jsonResponse({ ok: password === appPassword });
}

async function handleTranslate(request, env) {
  try {
    if (!env.GROQ_API_KEY) {
      return jsonResponse({ error: "GROQ_API_KEY belum diset di Secrets." }, 500);
    }

    const { text, from, to, password } = await request.json();

    if (env.APP_PASSWORD && password !== env.APP_PASSWORD) {
      return jsonResponse({ error: "Password salah atau belum dimasukkan." }, 401);
    }

    if (!text || typeof text !== "string" || !text.trim()) {
      return jsonResponse({ error: "Teks kosong." }, 400);
    }

    const translated = await callGroqTranslate(text, from, to, env.GROQ_API_KEY);
    return jsonResponse({ translated });
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}

async function callGroqTranslate(text, from, to, apiKey) {
  const systemPrompt =
    `Kamu adalah penerjemah profesional. Terjemahkan teks dari Bahasa ${from} ke Bahasa ${to}. ` +
    `PENTING: jawab HANYA dengan hasil terjemahannya saja, tanpa penjelasan, tanpa tanda kutip, ` +
    `tanpa komentar tambahan apapun.`;

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: text },
      ],
      temperature: 0.3,
      max_tokens: 1024,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(friendlyErrorMessage(response.status, errorText));
  }

  const data = await response.json();
  const result = data?.choices?.[0]?.message?.content;
  return result ? result.trim() : "Maaf, gagal menerjemahkan teks itu.";
}

function friendlyErrorMessage(status, rawErrorText) {
  const lower = rawErrorText.toLowerCase();
  if (status === 429 || lower.includes("rate limit")) {
    return "Kuota Groq habis untuk saat ini. Tunggu sebentar lalu coba lagi.";
  }
  if (status === 401 || status === 403) {
    return "API Key Groq tidak valid. Cek lagi nilai GROQ_API_KEY di Secrets.";
  }
  if (status === 503) {
    return "Server Groq sedang sibuk. Coba lagi sebentar.";
  }
  return `Terjadi kesalahan (${status}): ${rawErrorText}`;
}

function jsonResponse(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const HTML_PAGE = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Tutur Translate</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Sora:wght@600;700&family=Inter:wght@400;500&display=swap');

  :root {
    --bg: #0b0f1a;
    --panel: #131826;
    --border: #232a3d;
    --from-color: #ff8b6b;
    --to-color: #5fd4e0;
    --text: #edeff5;
    --muted: #7c87a3;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: 'Inter', sans-serif;
    background: var(--bg);
    color: var(--text);
    display: flex;
    justify-content: center;
    min-height: 100vh;
  }
  .app { width: 100%; max-width: 600px; padding: 28px 20px 40px; }
  header { text-align: center; margin-bottom: 6px; }
  header h1 { margin: 0; font-family: 'Sora', sans-serif; font-size: 28px; }
  header p { margin: 4px 0 0; color: var(--muted); font-size: 14px; }

  .wave { width: 100%; height: 26px; margin: 14px 0 22px; display: block; }
  .wave path { animation: breathe 2.6s ease-in-out infinite; transform-origin: center; }
  @keyframes breathe {
    0%, 100% { opacity: 0.55; transform: scaleY(0.85); }
    50% { opacity: 1; transform: scaleY(1.15); }
  }

  .lang-row { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; position: relative; }
  .custom-select { position: relative; flex: 1; }
  .select-trigger {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 11px 12px;
    border-radius: 8px;
    border: 1.5px solid var(--border);
    background: var(--panel);
    color: var(--text);
    font-family: 'Inter', sans-serif;
    font-size: 14px;
    cursor: pointer;
  }
  .custom-select.from .select-trigger { border-color: var(--from-color); }
  .custom-select.to .select-trigger { border-color: var(--to-color); }
  .chevron { color: var(--muted); font-size: 11px; transition: transform 0.15s ease; }
  .custom-select.open .chevron { transform: rotate(180deg); }
  .select-options {
    position: absolute;
    top: calc(100% + 6px);
    left: 0;
    right: 0;
    background: var(--panel);
    border: 1.5px solid var(--border);
    border-radius: 8px;
    list-style: none;
    margin: 0;
    padding: 6px;
    max-height: 240px;
    overflow-y: auto;
    z-index: 20;
    display: none;
    box-shadow: 0 12px 28px rgba(0,0,0,0.45);
  }
  .custom-select.open .select-options { display: block; }
  .select-options li {
    padding: 9px 10px;
    border-radius: 6px;
    font-size: 14px;
    cursor: pointer;
    color: var(--text);
  }
  .custom-select.from .select-options li:hover,
  .custom-select.from .select-options li.selected { background: rgba(255, 139, 107, 0.15); color: var(--from-color); }
  .custom-select.to .select-options li:hover,
  .custom-select.to .select-options li.selected { background: rgba(95, 212, 224, 0.15); color: var(--to-color); }
  .select-options::-webkit-scrollbar { width: 6px; }
  .select-options::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }

  #swap-btn {
    flex-shrink: 0;
    width: 38px;
    height: 38px;
    border-radius: 50%;
    border: 1px solid var(--border);
    background: var(--panel);
    color: var(--text);
    cursor: pointer;
    font-size: 16px;
  }
  #swap-btn:hover { background: var(--border); }

  .box { position: relative; border-radius: 10px; border: 1.5px solid var(--border); background: var(--panel); margin-bottom: 14px; }
  .box.from { border-color: var(--from-color); }
  .box.to { border-color: var(--to-color); }
  .box textarea {
    width: 100%;
    min-height: 100px;
    padding: 14px 50px 14px 14px;
    border: none;
    background: transparent;
    color: var(--text);
    font-family: 'Inter', sans-serif;
    font-size: 16px;
    resize: vertical;
  }
  .box textarea:focus { outline: none; }
  .box textarea::placeholder { color: var(--muted); }

  .icon-btn {
    position: absolute;
    top: 12px;
    right: 12px;
    width: 34px;
    height: 34px;
    border-radius: 50%;
    border: none;
    background: var(--border);
    color: var(--text);
    cursor: pointer;
    font-size: 15px;
  }
  .icon-btn:hover { filter: brightness(1.2); }
  .icon-btn.listening { background: var(--from-color); animation: pulse 1s infinite; }
  @keyframes pulse {
    0%, 100% { box-shadow: 0 0 0 0 rgba(255,139,107,0.5); }
    50% { box-shadow: 0 0 0 8px rgba(255,139,107,0); }
  }

  .status { text-align: center; color: var(--muted); font-size: 13px; min-height: 18px; margin-bottom: 6px; }

  .auto-speak {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: var(--muted);
    margin-bottom: 14px;
    cursor: pointer;
  }

  .gate { display: flex; align-items: center; justify-content: center; min-height: 100vh; width: 100%; padding: 20px; }
  .gate-card { background: var(--panel); border: 1px solid var(--border); border-radius: 10px; padding: 32px; width: 100%; max-width: 320px; text-align: center; }
  .gate-card h2 { margin: 0 0 16px; font-family: 'Sora', sans-serif; font-size: 17px; }
  .gate-card input {
    width: 100%; margin-bottom: 12px; padding: 12px; border-radius: 8px;
    border: 1px solid var(--border); background: var(--bg); color: var(--text); font-size: 15px;
  }
  .gate-card button {
    width: 100%; padding: 12px; border-radius: 8px; border: none;
    background: var(--from-color); color: #1a0f08; font-weight: 700; cursor: pointer;
  }
  .gate-error { color: #ff8a8a; font-size: 13px; margin: 10px 0 0; min-height: 16px; }

  @media (prefers-reduced-motion: reduce) {
    .wave path, .icon-btn.listening { animation: none; }
  }
</style>
</head>
<body>
  <div class="gate" id="gate">
    <div class="gate-card">
      <h2>🔒 Akses Terbatas</h2>
      <input id="gate-input" type="password" placeholder="Masukkan password" autocomplete="current-password" />
      <button id="gate-btn" type="button">Masuk</button>
      <p class="gate-error" id="gate-error"></p>
    </div>
  </div>

  <div class="app" id="app" style="display:none;">
    <header>
      <h1>Tutur Translate</h1>
      <p>Penerjemah instan -- ketik atau bicara, langsung diterjemahkan.</p>
    </header>

    <svg class="wave" viewBox="0 0 300 26" preserveAspectRatio="none">
      <defs>
        <linearGradient id="waveGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#ff8b6b" />
          <stop offset="100%" stop-color="#5fd4e0" />
        </linearGradient>
      </defs>
      <path d="M0,13 Q15,2 30,13 T60,13 T90,13 T120,13 T150,13 T180,13 T210,13 T240,13 T270,13 T300,13"
            stroke="url(#waveGrad)" stroke-width="3" fill="none" stroke-linecap="round" />
    </svg>

    <div class="lang-row">
      <div class="custom-select from" id="from-select">
        <button class="select-trigger" id="from-trigger" type="button">
          <span id="from-value">Indonesia</span>
          <span class="chevron">▾</span>
        </button>
        <ul class="select-options" id="from-options"></ul>
      </div>
      <button id="swap-btn" type="button" title="Tukar bahasa">⇄</button>
      <div class="custom-select to" id="to-select">
        <button class="select-trigger" id="to-trigger" type="button">
          <span id="to-value">Inggris</span>
          <span class="chevron">▾</span>
        </button>
        <ul class="select-options" id="to-options"></ul>
      </div>
    </div>

    <div class="box from">
      <textarea id="input-text" placeholder="Ketik atau tekan mik untuk bicara..."></textarea>
      <button class="icon-btn" id="mic-btn" type="button" title="Bicara">🎤</button>
    </div>

    <p class="status" id="status"></p>

    <div class="box to">
      <textarea id="output-text" placeholder="Hasil terjemahan muncul di sini..." readonly></textarea>
      <button class="icon-btn" id="speak-btn" type="button" title="Dengarkan">🔊</button>
    </div>

    <label class="auto-speak">
      <input type="checkbox" id="auto-speak-toggle" />
      Ucapkan hasil terjemahan otomatis
    </label>
  </div>

  <script>
    const LANGUAGES = {
      "Indonesia": "id-ID",
      "Inggris": "en-US",
      "Mandarin": "zh-CN",
      "Jepang": "ja-JP",
      "Korea": "ko-KR",
      "Arab": "ar-SA",
      "Prancis": "fr-FR",
      "Spanyol": "es-ES",
      "Jerman": "de-DE",
      "Thai": "th-TH",
      "Vietnam": "vi-VN"
    };

    // ---------- Gerbang password ----------
    const gateEl = document.getElementById("gate");
    const appEl = document.getElementById("app");
    const gateInput = document.getElementById("gate-input");
    const gateBtn = document.getElementById("gate-btn");
    const gateError = document.getElementById("gate-error");
    let appPassword = "";

    function showApp() {
      gateEl.style.display = "none";
      appEl.style.display = "block";
    }

    async function checkPassword(password) {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: password }),
      });
      const data = await res.json();
      return data.ok;
    }

    async function tryLogin() {
      const password = gateInput.value;
      gateBtn.disabled = true;
      gateError.textContent = "";
      try {
        const ok = await checkPassword(password);
        if (ok) {
          appPassword = password;
          showApp();
        } else {
          gateError.textContent = "Password salah, coba lagi.";
        }
      } catch (err) {
        gateError.textContent = "Gagal memeriksa password: " + err.message;
      } finally {
        gateBtn.disabled = false;
      }
    }

    checkPassword("").then(function (ok) {
      if (ok) { appPassword = ""; showApp(); }
    }).catch(function () {});

    gateBtn.addEventListener("click", tryLogin);
    gateInput.addEventListener("keydown", function (e) { if (e.key === "Enter") tryLogin(); });

    // ---------- Penerjemah ----------
    const swapBtn = document.getElementById("swap-btn");
    const inputText = document.getElementById("input-text");
    const outputText = document.getElementById("output-text");
    const micBtn = document.getElementById("mic-btn");
    const speakBtn = document.getElementById("speak-btn");
    const statusEl = document.getElementById("status");
    const autoSpeakToggle = document.getElementById("auto-speak-toggle");
    let autoSpeak = false;

    // ---------- Dropdown custom (gantinya <select>, biar bisa diwarnai sesuai tema) ----------
    function buildDropdown(prefix, defaultValue) {
      const wrapper = document.getElementById(prefix + "-select");
      const trigger = document.getElementById(prefix + "-trigger");
      const optionsEl = document.getElementById(prefix + "-options");

      Object.keys(LANGUAGES).forEach(function (name) {
        const li = document.createElement("li");
        li.textContent = name;
        li.dataset.value = name;
        if (name === defaultValue) li.classList.add("selected");
        li.addEventListener("click", function () {
          setDropdownValue(prefix, name);
          wrapper.classList.remove("open");
        });
        optionsEl.appendChild(li);
      });

      trigger.addEventListener("click", function (e) {
        e.stopPropagation();
        document.querySelectorAll(".custom-select.open").forEach(function (el) {
          if (el !== wrapper) el.classList.remove("open");
        });
        wrapper.classList.toggle("open");
      });
    }

    function setDropdownValue(prefix, name) {
      document.getElementById(prefix + "-value").textContent = name;
      document.querySelectorAll("#" + prefix + "-options li").forEach(function (li) {
        li.classList.toggle("selected", li.dataset.value === name);
      });
    }

    function getDropdownValue(prefix) {
      return document.getElementById(prefix + "-value").textContent;
    }

    document.addEventListener("click", function () {
      document.querySelectorAll(".custom-select.open").forEach(function (el) {
        el.classList.remove("open");
      });
    });

    buildDropdown("from", "Indonesia");
    buildDropdown("to", "Inggris");

    swapBtn.addEventListener("click", function () {
      const f = getDropdownValue("from");
      const t = getDropdownValue("to");
      setDropdownValue("from", t);
      setDropdownValue("to", f);
      const inputVal = inputText.value;
      inputText.value = outputText.value;
      outputText.value = inputVal;
    });

    let debounceTimer = null;
    inputText.addEventListener("input", function () {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(translateNow, 700);
    });

    async function translateNow() {
      const text = inputText.value.trim();
      if (!text) { outputText.value = ""; return; }

      statusEl.textContent = "Menerjemahkan...";
      try {
        const res = await fetch("/api/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: text,
            from: getDropdownValue("from"),
            to: getDropdownValue("to"),
            password: appPassword,
          }),
        });
        const data = await res.json();
        if (data.error) {
          statusEl.textContent = data.error;
        } else {
          outputText.value = data.translated;
          statusEl.textContent = "";
          if (autoSpeak) speakResult();
        }
      } catch (err) {
        statusEl.textContent = "Gagal terhubung: " + err.message;
      }
    }

    // ---------- Input suara (Web Speech API -- bawaan browser, gratis) ----------
    const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
    let recognizer = null;
    let isListening = false;

    if (!SpeechRecognitionClass) {
      micBtn.style.display = "none";
    } else {
      recognizer = new SpeechRecognitionClass();
      recognizer.continuous = false;
      recognizer.interimResults = false;

      recognizer.addEventListener("result", function (e) {
        const transcript = e.results[0][0].transcript;
        inputText.value = transcript;
        translateNow();
      });
      recognizer.addEventListener("end", function () {
        isListening = false;
        micBtn.classList.remove("listening");
      });
      recognizer.addEventListener("error", function (e) {
        statusEl.textContent = "Mik gagal: " + e.error;
        isListening = false;
        micBtn.classList.remove("listening");
      });

      micBtn.addEventListener("click", function () {
        if (isListening) { recognizer.stop(); return; }
        recognizer.lang = LANGUAGES[getDropdownValue("from")] || "id-ID";
        recognizer.start();
        isListening = true;
        micBtn.classList.add("listening");
        statusEl.textContent = "Mendengarkan...";
      });
    }

    // ---------- Output suara (Web Speech API -- bawaan browser, gratis) ----------
    const SpeechSynthesisAvailable = "speechSynthesis" in window;

    function speakResult() {
      if (!SpeechSynthesisAvailable || !outputText.value) return;
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(outputText.value);
      utterance.lang = LANGUAGES[getDropdownValue("to")] || "en-US";
      window.speechSynthesis.speak(utterance);
    }

    if (!SpeechSynthesisAvailable) {
      speakBtn.style.display = "none";
      autoSpeakToggle.parentElement.style.display = "none";
    } else {
      speakBtn.addEventListener("click", speakResult);
      autoSpeakToggle.addEventListener("change", function () {
        autoSpeak = autoSpeakToggle.checked;
      });
    }
  </script>
</body>
</html>`;
