/**
 * luna-whatsapp-bridge
 * Puente entre WhatsApp (whatsapp-web.js) y el workflow de n8n "Servicio al Cliente - Luz de Luna"
 *
 * Flujo:
 *   WhatsApp → (mensaje entrante) → POST a N8N_WEBHOOK_URL
 *   n8n → (quiere responder) → POST a este servicio en /send  → WhatsApp
 *
 * Variables de entorno necesarias (configurar en Railway):
 *   N8N_WEBHOOK_URL   → URL del webhook de n8n que recibe los mensajes entrantes
 *                       ej: https://n8n-production-XXXX.up.railway.app/webhook/atencion-cliente-eventos
 *   BRIDGE_SECRET     → token secreto que n8n debe enviar en el header "x-bridge-secret" al llamar /send
 *   PORT              → (Railway lo define solo, normalmente no hace falta tocarlo)
 */

const express = require('express');
const qrcode = require('qrcode');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const fs = require('fs');
const path = require('path');

const app = express();

// Evitar que errores no capturados maten el proceso
process.on('unhandledRejection', (reason, promise) => {
  console.error('⚠️ unhandledRejection:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('⚠️ uncaughtException:', err);
});
app.use(express.json());

const PORT = process.env.PORT || 3000;
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || '';
const BRIDGE_SECRET = process.env.BRIDGE_SECRET || 'change-me';

let lastQr = null;
let isReady = false;

// Deduplicador: usa filesystem + memory para funcionar con múltiples instancias Railway
// El volumen /data es compartido entre instancias, así que el lock file es global
const recentMessages = new Map();
const DEDUP_DIR = '/data/dedup';
try { if (!fs.existsSync(DEDUP_DIR)) fs.mkdirSync(DEDUP_DIR, { recursive: true }); } catch(e) {}

function isDuplicate(msg) {
  // Usar msg.id.id (hash puro) como clave primaria — _serialized incluye el "from"
  // (@lid vs @c.us) y por eso difiere entre los dos eventos del mismo mensaje.
  // El hash msg.id.id sí es idéntico en ambos.
  const msgId = (msg.id && (msg.id.id || msg.id._serialized)) || null;
  const from = (msg.from || '').replace(/[^a-z0-9]/gi, '').slice(0, 20);
  const ts = msg.timestamp || Math.floor(Date.now() / 1000);
  const key = msgId ? `id_${msgId}` : `${from}_${ts}`;
  const lockFile = path.join(DEDUP_DIR, key);

  // In-memory check (fast path, same process)
  if (recentMessages.has(key)) {
    console.log('🔁 Duplicado ignorado (mem):', key);
    return true;
  }

  // Filesystem check (cross-instance)
  try {
    if (fs.existsSync(lockFile)) {
      console.log('🔁 Duplicado ignorado (file):', key);
      return true;
    }
    fs.writeFileSync(lockFile, Date.now().toString());
    setTimeout(() => { try { fs.unlinkSync(lockFile); } catch(e) {} }, 30000);
  } catch(e) {
    console.warn('⚠️ Dedup filesystem error:', e.message);
  }

  recentMessages.set(key, true);
  setTimeout(() => recentMessages.delete(key), 30000);
  return false;
}

// --- Cliente de WhatsApp ---
const client = new Client({
  authStrategy: new LocalAuth({ dataPath: '/data/wwebjs_auth' }),
  puppeteer: {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--single-process',
      '--disable-gpu',
    ],
  },
});

client.on('qr', async (qr) => {
  lastQr = qr;
  isReady = false;
  console.log('📱 Nuevo código QR generado. Visita /qr en el navegador para escanearlo.');
});

client.on('ready', () => {
  isReady = true;
  lastQr = null;
  console.log('✅ WhatsApp conectado y listo.');
  console.log('📡 N8N_WEBHOOK_URL:', N8N_WEBHOOK_URL || '⚠️ NO CONFIGURADA');
});

client.on('disconnected', (reason) => {
  isReady = false;
  console.log('⚠️ WhatsApp desconectado:', reason);
  // Si la sesión expiró, limpiar y reinicializar después de 5s
  if (reason === 'LOGOUT' || reason === 'NAVIGATION') {
    console.log('🔄 Limpiando sesión y reinicializando...');
    setTimeout(() => {
      try {
        const authPath = '/data/wwebjs_auth';
        if (fs.existsSync(authPath)) {
          fs.rmSync(authPath, { recursive: true, force: true });
          console.log('🗑️ Sesión eliminada');
        }
      } catch(e) { console.error('Error limpiando sesión:', e); }
      client.initialize().catch(err => console.error('Error reinicializando:', err));
    }, 5000);
  }
});

client.on('auth_failure', (msg) => {
  console.error('❌ Auth failure:', msg);
  isReady = false;
  lastQr = null;
  // Limpiar sesión corrupta y reinicializar
  setTimeout(() => {
    try {
      const authPath = '/data/wwebjs_auth';
      if (fs.existsSync(authPath)) {
        fs.rmSync(authPath, { recursive: true, force: true });
        console.log('🗑️ Sesión corrupta eliminada, generando nuevo QR...');
      }
    } catch(e) { console.error('Error limpiando sesión:', e); }
    client.initialize().catch(err => console.error('Error reinicializando:', err));
  }, 3000);
});

// Manejador central de mensajes
async function handleMessage(msg) {
  try {
    // Ignorar estados, mensajes propios y grupos
    if (msg.from === 'status@broadcast') return;
    if (msg.fromMe) return;
    if (msg.from.endsWith('@g.us')) return;
    if (isDuplicate(msg)) return;

    console.log(`📨 Mensaje recibido de ${msg.from}: "${msg.body?.slice(0, 80)}"`);

    // Normalizar identidad: los eventos @lid usan un id de privacidad distinto al
    // número real → la memoria del cliente quedaría partida en dos. Resolver a @c.us.
    let fromId = msg.from;
    if (fromId.endsWith('@lid')) {
      try {
        const contact = await msg.getContact();
        if (contact && contact.number) {
          fromId = contact.number + '@c.us';
          console.log(`🔁 @lid resuelto a ${fromId}`);
        }
      } catch (e) {
        console.warn('⚠️ No se pudo resolver @lid:', e.message);
      }
    }

    const payload = {
      from: fromId,
      body: msg.body,
      timestamp: msg.timestamp,
      type: msg.type,
      hasMedia: msg.hasMedia,
      notifyName: msg._data?.notifyName || '',
      pushname: msg._data?.pushname || '',
    };

    if (!N8N_WEBHOOK_URL) {
      console.warn('⚠️ N8N_WEBHOOK_URL no configurada — mensaje no reenviado.');
      return;
    }

    console.log(`📤 Reenviando a n8n: ${N8N_WEBHOOK_URL}`);

    const res = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      console.log(`✅ Mensaje reenviado a n8n correctamente (${res.status})`);
    } else {
      const txt = await res.text();
      console.error(`❌ Error reenviando a n8n: ${res.status} — ${txt}`);
    }
  } catch (err) {
    console.error('❌ Error procesando mensaje entrante:', err);
  }
}

// Capturar mensajes entrantes
client.on('message', handleMessage);

// Inicializar con manejo de errores — si falla por sesión corrupta, limpiar y reintentar
function initClient() {
  client.initialize().catch(err => {
    console.error('❌ Error en initialize(), limpiando sesión y reintentando en 10s:', err.message);
    isReady = false;
    lastQr = null;
    setTimeout(() => {
      try {
        const authPath = '/data/wwebjs_auth';
        if (fs.existsSync(authPath)) {
          fs.rmSync(authPath, { recursive: true, force: true });
          console.log('🗑️ Sesión eliminada, reintentando...');
        }
      } catch(e) { console.error('Error limpiando:', e); }
      initClient();
    }, 10000);
  });
}
initClient();

// --- Endpoints HTTP ---

// Salud / estado
app.get('/', (req, res) => {
  res.json({ ok: true, whatsappReady: isReady });
});

// Página con el QR para vincular el número (ábrela en el navegador la primera vez)
app.get('/qr', async (req, res) => {
  if (isReady) {
    return res.send('<h2>✅ WhatsApp ya está conectado. No necesitas escanear nada.</h2>');
  }
  if (!lastQr) {
    return res.send('<h2>⏳ Generando código QR... recarga esta página en unos segundos.</h2>');
  }
  const qrImage = await qrcode.toDataURL(lastQr);
  res.send(`
    <html>
      <body style="display:flex;flex-direction:column;align-items:center;font-family:sans-serif;margin-top:40px;">
        <h2>Escanea este código con WhatsApp → Dispositivos vinculados</h2>
        <img src="${qrImage}" style="width:300px;height:300px;" />
        <p>Esta página se actualiza sola — recárgala si el código expira.</p>
      </body>
    </html>
  `);
});

// Endpoint de dedup atómico para n8n
// Node.js es single-threaded → solo 1 request se procesa a la vez → atómico por diseño
// n8n llama esto ANTES de procesar. Si retorna {duplicate:true}, la ejecución se detiene.
app.post('/dedup', (req, res) => {
  const { key } = req.body || {};
  if (!key) return res.status(400).json({ duplicate: false, error: 'missing key' });
  const dedupKey = 'n8n_' + key;
  if (recentMessages.has(dedupKey)) {
    console.log('🔁 n8n dedup BLOQUEADO:', key);
    return res.json({ duplicate: true });
  }
  recentMessages.set(dedupKey, true);
  setTimeout(() => recentMessages.delete(dedupKey), 60000);
  console.log('✅ n8n dedup PERMITIDO:', key);
  res.json({ duplicate: false });
});

// n8n llama aquí para enviar un mensaje al cliente
app.post('/send', async (req, res) => {
  const secret = req.headers['x-bridge-secret'];
  if (secret !== BRIDGE_SECRET) {
    return res.status(401).json({ ok: false, error: 'unauthorized' });
  }

  const { to, message } = req.body || {};
  if (!to || !message) {
    return res.status(400).json({ ok: false, error: 'Faltan "to" y/o "message"' });
  }

  if (!isReady) {
    return res.status(503).json({ ok: false, error: 'WhatsApp no está listo todavía' });
  }

  try {
    // Acepta tanto "573001234567" como "573001234567@c.us"
    const chatId = to.includes('@') ? to : `${to}@c.us`;
    await client.sendMessage(chatId, message);
    res.json({ ok: true });
  } catch (err) {
    console.error('❌ Error enviando mensaje:', err);
    res.status(500).json({ ok: false, error: String(err) });
  }
});

// n8n llama aquí para enviar un documento (PDF, imagen, etc.) al cliente
app.post('/send-document', async (req, res) => {
  const secret = req.headers['x-bridge-secret'];
  if (secret !== BRIDGE_SECRET) {
    return res.status(401).json({ ok: false, error: 'unauthorized' });
  }

  const { to, base64, filename, caption, mimetype } = req.body || {};
  if (!to || !base64 || !filename) {
    return res.status(400).json({ ok: false, error: 'Faltan "to", "base64" y/o "filename"' });
  }

  if (!isReady) {
    return res.status(503).json({ ok: false, error: 'WhatsApp no está listo todavía' });
  }

  try {
    const chatId = to.includes('@') ? to : `${to}@c.us`;
    const media = new MessageMedia(
      mimetype || 'application/pdf',
      base64,
      filename
    );
    await client.sendMessage(chatId, media, { caption: caption || '' });
    res.json({ ok: true });
  } catch (err) {
    console.error('❌ Error enviando documento:', err);
    res.status(500).json({ ok: false, error: String(err) });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 luna-whatsapp-bridge escuchando en puerto ${PORT}`);
});
