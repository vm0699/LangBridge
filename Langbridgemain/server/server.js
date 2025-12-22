/**
 * LangBridge Chat Server (Socket.IO + Express)
 * - Per-recipient translation: each socket chooses its own viewLang per room
 * - Dual fallback translators:
 *     1) @vitalets/google-translate-api (ESM via dynamic import)
 *     2) @iamtraction/google-translate (CommonJS)
 * - Loopback so you can test with a single device
 * - Added: POST /v1/translate for Discord bot adapter
 */

const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');

const PORT = process.env.PORT || 5000;
const SOCKET_PATH = '/ws/chat';
const LOOPBACK_FOR_DEMO = process.env.LOOPBACK === 'false' ? false : true;

// ---------- translation helpers ----------
function normalize(code) {
  if (!code) return 'auto';
  const c = String(code).toLowerCase();
  if (c === 'zh-cn') return 'zh-CN';
  if (c === 'zh-tw') return 'zh-TW';
  return c;
}

let esmTranslateFn = null;
let cjsTranslateFn = null;

async function ensureESMTranslate() {
  if (esmTranslateFn) return esmTranslateFn;
  try {
    const mod = await import('@vitalets/google-translate-api'); // ESM-only
    const fn = mod?.default || mod;
    if (typeof fn === 'function') esmTranslateFn = fn;
  } catch (e) {
    console.error('[ensureESMTranslate]', e?.message || e);
  }
  return esmTranslateFn;
}

function ensureCJSTranslate() {
  if (cjsTranslateFn) return cjsTranslateFn;
  try {
    const fn = require('@iamtraction/google-translate'); // CommonJS
    if (typeof fn === 'function') cjsTranslateFn = fn;
  } catch (e) {
    console.error('[ensureCJSTranslate]', e?.message || e);
  }
  return cjsTranslateFn;
}

async function translate(text, srcLang, targetLang) {
  const from = normalize(srcLang);
  const to = normalize(targetLang);

  try {
    const t1 = await ensureESMTranslate();
    if (t1) {
      const r = await t1(text, { from: from === 'auto' ? 'auto' : from, to });
      if (r?.text) return { text: r.text, detected: r?.from?.language?.iso || from || 'auto' };
    }
  } catch (e) {
    console.error('[translate/esm]', e?.message || e);
  }

  try {
    const t2 = ensureCJSTranslate();
    if (t2) {
      const r = await t2(text, { from: from === 'auto' ? 'auto' : from, to });
      if (r?.text) return { text: r.text, detected: r?.from?.language?.iso || from || 'auto' };
    }
  } catch (e) {
    console.error('[translate/cjs]', e?.message || e);
  }

  // fallback so UX never blocks
  return { text, detected: from || 'auto' };
}

// ---------- server ----------
function roomId(peerId) { return `room:${peerId}`; }

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => res.json({ ok: true, time: Date.now() }));

// --- REST endpoint used by the Discord bot ---
app.post('/v1/translate', async (req, res) => {
  try {
    const { text, sourceLang = 'auto', targetLang = 'en' } = req.body || {};
    if (!text || !targetLang) return res.status(400).json({ error: 'invalid_payload' });

    const r = await translate(text, sourceLang, targetLang);
    return res.json({ translatedText: r.text, detectedLang: r.detected });
  } catch (err) {
    console.error('[http] /v1/translate error', err);
    res.status(500).json({ error: 'server_error' });
  }
});

const server = http.createServer(app);
const io = new Server(server, { path: SOCKET_PATH, cors: { origin: '*' } });

// demo auth
io.use((socket, next) => {
  const token = socket.handshake?.auth?.token;
  if (!token) return next(new Error('no token'));
  socket.userId = token;
  // per-socket map: { roomId: viewLang }
  socket.data.viewLangByRoom = Object.create(null);
  next();
});

io.on('connection', (socket) => {
  console.log('[io] connected:', socket.userId);

  // client joins a peer room + declares their receive language (viewLang)
  socket.on('room:join', ({ peerId, viewLang }) => {
    if (!peerId) return;
    const rid = roomId(peerId);
    socket.join(rid);
    if (viewLang) socket.data.viewLangByRoom[rid] = viewLang;
    console.log('[io] joined', rid, 'viewLang=', socket.data.viewLangByRoom[rid] || '(none)');
  });

  // allow updating viewLang without rejoining
  socket.on('prefs:viewLang', ({ peerId, viewLang }) => {
    const rid = roomId(peerId);
    if (viewLang) socket.data.viewLangByRoom[rid] = viewLang;
    console.log('[io] prefs:viewLang', rid, '=>', viewLang);
  });

  // sender submits a message; we deliver to each other socket in THEIR language
  socket.on('message:send', async (p) => {
    try {
      if (!p || !p.tempId || !p.text || !p.peerId) {
        return socket.emit('message:ack', {
          tempId: p?.tempId || 'unknown', ts: Date.now(), status: 'failed', error: 'invalid_payload'
        });
      }

      const id = 'srv_' + Math.random().toString(36).slice(2, 8);
      socket.emit('message:ack', { tempId: p.tempId, id, ts: Date.now(), status: 'sent' });

      const rid = roomId(p.peerId);
      const sockets = await io.in(rid).fetchSockets();

      for (const dst of sockets) {
        if (dst.id === socket.id) continue; // don't double-send to sender here
        const lang = dst.data.viewLangByRoom[rid] || 'en';
        const r = await translate(p.text, p.srcLang || 'auto', lang);
        io.to(dst.id).emit('message:new', {
          id,
          from: 'them',
          text: p.text,
          srcLang: p.srcLang || 'en',
          targetLang: lang,
          ts: Date.now(),
          translatedText: r.text,
        });
      }

      // loopback so you can test solo; use sender's own room viewLang
      if (LOOPBACK_FOR_DEMO) {
        const lang = socket.data.viewLangByRoom[rid] || 'en';
        const r = await translate(p.text, p.srcLang || 'auto', lang);
        socket.emit('message:new', {
          id,
          from: 'them',
          text: p.text,
          srcLang: p.srcLang || 'en',
          targetLang: lang,
          ts: Date.now(),
          translatedText: r.text,
        });
      }

      setTimeout(() => socket.emit('receipt:delivered', { id }), 300);
      setTimeout(() => socket.emit('receipt:read', { id }), 1200);
    } catch (err) {
      console.error('[io] message:send failed:', err);
      socket.emit('message:ack', { tempId: p?.tempId || 'unknown', ts: Date.now(), status: 'failed', error: 'server_error' });
    }
  });

  socket.on('receipt:read', ({ ids }) => console.log('[io] read:', ids));
  socket.on('disconnect', (reason) => console.log('[io] disconnected:', socket.userId, reason));
});

server.listen(PORT, () => {
  console.log(`Mock server on http://172.20.10.4:${PORT}`);
  console.log(`Health:       GET  /health`);
  console.log(`Translator:   POST /v1/translate`);
  console.log(`Socket path:  ${SOCKET_PATH}`);
  console.log(`LOOPBACK_FOR_DEMO = ${LOOPBACK_FOR_DEMO}`);
});
