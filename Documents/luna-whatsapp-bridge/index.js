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
const { Client, LocalAuth } = require('whatsapp-web.js');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || '';
const BRIDGE_SECRET = process.env.BRIDGE_SECRET || 'change-me';

let lastQr = null;
let isReady = false;

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
});

// Manejador central de mensajes
async function handleMessage(msg) {
  try {
    // Ignorar estados, mensajes propios y grupos
    if (msg.from === 'status@broadcast') return;
    if (msg.fromMe) return;
    if (msg.from.endsWith('@g.us')) return;

    console.log(`📨 Mensaje recibido de ${msg.from}: "${msg.body?.slice(0, 80)}"`);

    const payload = {
      from: msg.from,
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

// Capturar mensajes entrantes (ambos eventos por compatibilidad)
client.on('message', handleMessage);
client.on('message_create', (msg) => {
  if (!msg.fromMe) handleMessage(msg);
});

client.initialize();

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
    const { MessageMedia } = require('whatsapp-web.js');
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
