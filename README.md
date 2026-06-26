# Tutur - Penerjemah Instan

Penerjemah real-time -- ketik atau bicara, langsung diterjemahkan, hampir tanpa jeda. Didukung **Groq API** (gratis, terkenal super cepat). Jalan di Cloudflare Workers, satu file JavaScript, 100% gratis tanpa kartu kredit.

## Kenapa pakai Groq, bukan Gemini?

Groq dibangun di atas chip khusus (LPU) yang didesain spesifik buat inferensi AI super cepat -- ini jualan utama mereka, bukan kebetulan. Cocok banget buat kasus "instan" kayak penerjemah ini, dan jarang mengalami server sibuk seperti yang sempat dialami di proyek-proyek berbasis Gemini sebelumnya.

Model yang dipakai: `llama-3.1-8b-instant` -- model open-source dari Meta (Llama), bukan Gemini.

## Fitur

- ⌨️ **Ketik & otomatis diterjemahkan** -- berhenti ngetik sebentar, terjemahan langsung muncul (tanpa perlu klik tombol)
- 🎤 **Input suara** -- tekan mik, bicara, otomatis jadi teks lalu diterjemahkan (pakai Web Speech API bawaan browser, gratis, tidak butuh API tambahan)
- 🔊 **Baca hasil terjemahan** -- tombol dengarkan, atau aktifkan toggle biar otomatis dibacakan tiap kali ada hasil baru
- ⇄ **Tukar bahasa** -- satu klik buat membalik arah terjemahan
- 🔒 **Proteksi password (opsional)**

## Catatan soal browser

Input suara (mik) dan baca otomatis cuma didukung baik di **Chrome, Edge, atau browser berbasis Chromium lainnya**. Kalau browser kamu tidak mendukung, tombol mik/dengarkan otomatis disembunyikan -- penerjemah tetap berfungsi normal lewat ketik teks.

## Setup dari Nol

### 1. Dapatkan API Key Groq (gratis)

1. Buka [console.groq.com](https://console.groq.com), daftar gratis (tanpa kartu kredit)
2. Masuk ke bagian **API Keys**, klik **Create API Key**, salin key-nya

### 2. Upload ke GitHub

Upload semua file di sini: `src/index.js`, `wrangler.jsonc`, `.gitignore`.

### 3. Hubungkan ke Cloudflare Workers

1. Dashboard Cloudflare (akun yang sama dari proyek-proyek sebelumnya) → **Workers & Pages** → **Create** → **Import a Git Repository**
2. Pilih repo `tutur`, beri izin akses, biarkan Cloudflare deploy otomatis
3. Kamu dapat URL seperti `https://tutur.<username-kamu>.workers.dev`

### 4. Isi Secrets

Di halaman Worker kamu → **Settings → Variables and Secrets**, tambahkan:
- `GROQ_API_KEY` = API key Groq kamu
- `APP_PASSWORD` (opsional, disarankan) = password pilihan kamu

### 5. Buka link-nya dan coba!

- Ketik kalimat di kotak kiri, tunggu sebentar -- hasilnya otomatis muncul di kanan
- Coba tekan 🎤, ucapkan sesuatu
- Coba klik 🔊 buat dengar hasil terjemahannya

## Catatan teknis

- **Tanpa SDK** -- panggilan ke Groq murni pakai `fetch()`, formatnya sama persis dengan OpenAI Chat Completions API (Groq memang didesain kompatibel dengan format itu)
- **Debounce 700ms** -- supaya tidak mengirim request ke API di setiap ketukan huruf, terjemahan baru dikirim setelah kamu berhenti mengetik sebentar
- **Web Speech API** sepenuhnya berjalan di browser pengguna, gratis, tidak melewati server Worker sama sekali -- cuma teks hasilnya yang dikirim ke `/api/translate`

## Ide pengembangan lanjutan

- Ganti model ke `llama-3.3-70b-versatile` di `GROQ_MODEL` kalau mau kualitas terjemahan lebih tinggi (sedikit lebih lambat)
- Simpan riwayat terjemahan (mirip pendekatan di proyek Kawan)
- Deteksi otomatis bahasa asal, tanpa perlu pilih manual
