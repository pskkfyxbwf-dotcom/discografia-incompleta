# HANDOFF — Luna WhatsApp Bridge + n8n "Servicio al Cliente - Luz de Luna"
Fecha: 2026-06-10

## ESTADO ACTUAL (verificado al cierre de esta sesión)

- **Bridge** (`luna-whatsapp-bridge`, Railway, repo `/Users/sinlukiado/Documents/luna-whatsapp-bridge`):
  - Desplegado, deployment más reciente con commit `b1xxxxx "Fallback adicional: usar chat.sendMessage() vía getChatById(@lid)..."`.
  - `GET /` → `{"ok":true,"whatsappReady":true}` — WhatsApp CONECTADO (sesión recién re-vinculada por QR).
  - **Mensajes entrantes funcionan perfecto**: cada mensaje de WhatsApp llega al bridge, se resuelve `@lid → @c.us`, se reenvía a n8n y n8n responde 200 OK. Confirmado repetidamente en logs.
  - **Mensajes salientes (Luna → WhatsApp) NO LLEGAN AL TELÉFONO**, a pesar de que:
    - n8n llama a `/send` (se ve en logs "🔁 Reintentando envío vía chat @lid: ...")
    - Ni `client.sendMessage(chatId@c.us, ...)` ni el fallback `chat.sendMessage()` (vía `getChatById(@lid)`) lanzan error visible.
    - El usuario confirmó VARIAS veces que no llega ninguna respuesta al teléfono, con distintos mensajes de prueba.

- **n8n** (`https://n8n-production-517c9.up.railway.app`, workflow `aHTlLwYiBmcNMSWH` "🎉 Servicio al Cliente - Luz de Luna"):
  - Online, activo, recibiendo webhooks correctamente (200 OK confirmados).
  - Versión actualizada de 2.23.4 → 2.25.7 (por el redeploy de recuperación de hoy).
  - `N8N_PROXY_HOPS=1` fue seteado (para intentar arreglar el bug de sesión 401 del editor) — **NO VERIFICADO** si solucionó el problema de autosave/login.
  - El nodo **"Leer Config"** tiene una edición de prompt PENDIENTE (tono + anti-repetición de "en un momento te envío tu cotización formal") que está SOLO en `localStorage.__lunaConfigBackup` del tab de Chrome (id 494205714), NO guardada en el workflow real.

## QUÉ SE ARREGLÓ HOY (confirmado funcionando)

1. **PDF / documentos grandes**: `express.json({limit:'25mb'})` agregado al bridge — desplegado. (Falta verificación end-to-end porque las respuestas salientes no llegan, ver abajo).
2. **Dedup multi-instancia**: usando `/data/dedup` (filesystem compartido) + `msg.id.id` — funcionando, confirmado en logs ("✅ n8n dedup PERMITIDO" / "🔁 Duplicado ignorado").
3. **Resolución @lid → @c.us para identidad del cliente** (para que la memoria de n8n no se parta entre @lid y @c.us) — funcionando.
4. **Endpoint `/send-document`** para enviar PDFs vía WhatsApp — agregado, no probado end-to-end por el problema de envío.
5. **n8n recuperado de un crash-loop** causado por una variable de entorno mal puesta (`N8N_USER_FOLDER`) — resuelto con `railway redeploy --yes`, sin pérdida de datos (Postgres intacto).

## EL PROBLEMA RAÍZ NO RESUELTO: "No LID for user" / envíos salientes silenciosos

### Diagnóstico
- La cuenta de WhatsApp del cliente de prueba usa el sistema nuevo de identidad **@lid** (Linked ID / privacidad de número) que WhatsApp introdujo para multi-dispositivo.
- `whatsapp-web.js` instalado es **`^1.26.0`** (ver `package.json`). Esta versión tiene soporte INCOMPLETO para @lid en el lado de ENVÍO (recepción funciona bien).
- Primer síntoma: `client.sendMessage('<numero>@c.us', mensaje)` lanza `Error: No LID for user` en `Client.js:1533`.
- Se intentó un fallback: guardar el `@lid` original visto al recibir el mensaje (`lidMap`), y al fallar el envío a `@c.us`, reintentar con:
  - `client.sendMessage('<lid>@lid', mensaje)` → no lanza error pero el mensaje no llega.
  - `(await client.getChatById('<lid>@lid')).sendMessage(mensaje)` → tampoco lanza error pero el mensaje no llega.
- Conclusión: el envío "resuelve" (la promesa se cumple) pero WhatsApp internamente no está logrando enrutar/entregar el mensaje — esto es consistente con bugs reportados en whatsapp-web.js para cuentas @lid en versiones <1.28.

### RECOMENDACIÓN PRINCIPAL PARA LA PRÓXIMA SESIÓN (en orden de prioridad)

**Opción A (recomendada, probar primero): actualizar `whatsapp-web.js` a la última versión (1.28.x o superior)**
- Editar `/Users/sinlukiado/Documents/luna-whatsapp-bridge/package.json`: cambiar `"whatsapp-web.js": "^1.26.0"` → `"whatsapp-web.js": "^1.28.0"` (verificar última versión estable en npm antes: `npm view whatsapp-web.js version`).
- Las versiones 1.27+ incluyen mejoras específicas de manejo de `@lid` (PRs relacionados a "LID support", "getNumberId LID fallback").
- Revertir el código de `sendWithLidFallback` a algo simple después de actualizar — probablemente `client.sendMessage(chatId, ...)` directo a `@c.us` ya funcione con la librería nueva. Si sigue fallando, mantener el fallback a `chat.sendMessage()`.
- **IMPORTANTE**: este cambio requiere `npm install` (regenerar lockfile) + rebuild de Docker + redeploy. CADA REDEPLOY BORRA LA SESIÓN DE WHATSAPP (ver sección siguiente) — avisar al usuario ANTES de desplegar que tendrá que volver a escanear el QR, y hacerlo en un momento sin prisa (no 5 minutos antes de la presentación).

**Opción B (si A no resuelve): probar deshabilitar/forzar identidad por número**
- En WhatsApp del teléfono: Ajustes → Privacidad → revisar si hay alguna opción relacionada con "número de teléfono" vs "ID vinculado" (función relativamente nueva, nombre exacto puede variar). Si se puede desactivar el uso de @lid para esa cuenta, `@c.us` debería volver a funcionar con la librería actual.

**Opción C (más invasiva, último recurso): migrar a `@whiskeysockets/baileys`**
- Librería alternativa sin Puppeteer/Chromium, con soporte nativo y más maduro de multi-dispositivo y LID. Requiere reescribir `index.js` casi por completo (otra arquitectura de cliente/eventos) y volver a vincular sesión. Solo considerar si A y B fallan y hay tiempo suficiente (no para el día de la presentación).

## PROBLEMA OPERATIVO IMPORTANTE: cada redeploy del bridge borra la sesión de WhatsApp

### Causa
- Railway, al desplegar, arranca el contenedor nuevo ANTES de apagar el viejo (rolling deploy). Ambos contenedores comparten el volumen `/data` (incluye `/data/wwebjs_auth`, el perfil de Chromium).
- El contenedor nuevo falla al lanzar Chromium: `Failed to launch the browser process: Code: 21` + `The profile appears to be in use by another Chromium process` (profile lock).
- El handler `client.on('auth_failure', ...)` / el catch de `initClient()` en `index.js` entonces **borra `/data/wwebjs_auth`** y regenera un QR nuevo — sesión perdida.
- A veces, incluso tras escanear el QR nuevo, llega un evento `disconnected: LOGOUT` espontáneo (causado por el contenedor viejo todavía corriendo y "peleando" por la sesión), obligando a escanear DOS VECES.

### Mitigaciones para la próxima sesión (elegir una antes de cualquier redeploy)
1. **Antes de hacer `railway up`**, escalar el servicio a 0 réplicas, esperar a que el contenedor viejo termine completamente, desplegar, y luego escalar a 1. Esto evita el solape de contenedores. (`railway` CLI: revisar comando de scale/replicas en el dashboard si el CLI no lo soporta directamente — puede requerir hacerlo desde la web de Railway).
2. Alternativamente, ANTES de desplegar, hacer manualmente `rm -rf /data/wwebjs_auth` desde un shell del contenedor (si Railway permite `railway run` o shell remoto) para que el contenedor nuevo arranque limpio sin pelear por el lock — de todas formas requeriría rescaneo, pero evitaría el doble-escaneo por LOGOUT.
3. Como mínimo: **avisar siempre al usuario ANTES de cada `railway up` del bridge** que deberá re-escanear el QR (puede tardar 1-2 intentos), y NO hacerlo cerca de la hora de la presentación.

### Código relevante (NO TOCAR sin necesidad — entender primero)
- `/Users/sinlukiado/Documents/luna-whatsapp-bridge/index.js`:
  - `client.on('auth_failure', ...)` (línea ~129) y el catch de `initClient()` (línea ~210): ambos borran `/data/wwebjs_auth` y reintentan — son la causa de la pérdida de sesión tras el profile-lock. Considerar, como mejora futura, NO borrar la sesión automáticamente en el primer fallo de "profile lock" (detectar ese mensaje específico y solo reintentar sin borrar, con backoff), para que el contenedor nuevo simplemente espere a que el viejo libere el lock.
  - `lidMap` (línea ~40-45) y `sendWithLidFallback` (línea ~280 aprox.): lógica del fallback @lid descrita arriba — candidata a simplificar/eliminar tras actualizar whatsapp-web.js.

## TAREAS PENDIENTES — TONO Y MEMORIA (Issues 5 y 6)

- La edición del prompt del nodo **"Leer Config"** (agrega párrafo "ESTILO DE RESPUESTA" + nota anti-repetición de "en un momento te envío tu cotización formal") está:
  - Backupeada en `localStorage.getItem('__lunaConfigBackup')` en el tab de Chrome 494205714 (n8n editor).
  - NO guardada en el workflow — falló el autosave con `401 Unauthorized` repetidamente (`workflowSave` Pinia store: `lastError: "Unauthorized", retryCount: 6`).
- **Antes de reintentar guardar**: verificar si `N8N_PROXY_HOPS=1` (ya seteado hoy, redeploy `b80f8682` exitoso) arregló el problema de sesión/login. Procedimiento de verificación:
  1. Abrir `https://n8n-production-517c9.up.railway.app` en una pestaña NUEVA (sin cookies viejas, o en incógnito).
  2. Iniciar sesión normalmente.
  3. Abrir el workflow `aHTlLwYiBmcNMSWH`, hacer un cambio trivial (ej. mover un nodo 1px) y ver si el autosave funciona (revisar Pinia `workflowSave.lastError` debe quedar `null`, o simplemente ver que no aparece el típico error de guardado en la UI).
  4. Si autosave funciona: recuperar el texto desde `localStorage.getItem('__lunaConfigBackup')` (en el tab viejo 494205714, si sigue abierto) y pegarlo en el nodo "Leer Config", guardar y publicar/activar.
  5. Si SIGUE fallando con 401: el problema no era el proxy. Hipótesis alternativas a investigar: cookie `Secure`/`SameSite` vs dominio de Railway (`*.up.railway.app` — revisar si n8n necesita `N8N_SECURE_COOKIE=false` si el tráfico interno no es HTTPS puro, o `N8N_EDITOR_BASE_URL` mal configurado).

## RESUMEN DE PRIORIDADES PARA LA PRÓXIMA SESIÓN

1. **(CRÍTICO, bloquea todo)** Actualizar `whatsapp-web.js` a 1.28+ en el bridge → resolver envíos salientes (@lid). Avisar de antemano sobre el rescaneo de QR. Verificar con mensaje de prueba real ANTES de tocar nada más.
2. Una vez que las respuestas de Luna lleguen al teléfono: probar PDF end-to-end (`/send-document`) con una cotización real.
3. Verificar si `N8N_PROXY_HOPS=1` arregló el 401 del editor de n8n. Si sí, pegar el prompt backupeado de "Leer Config" (tono + anti-repetición), guardar, activar.
4. Solo si sobra tiempo: mejorar el manejo de `auth_failure`/profile-lock en `index.js` para que futuros redeploys no borren la sesión automáticamente.

## COMANDOS ÚTILES (Railway CLI)

```bash
# Ver logs del bridge (desde cualquier carpeta vinculada al proyecto del bridge)
npx --yes @railway/cli@5.8.0 logs

# Desplegar el bridge desde su carpeta
cd /Users/sinlukiado/Documents/luna-whatsapp-bridge
npx --yes @railway/cli@5.8.0 up . --path-as-root -c -y

# Ver variables de entorno
npx --yes @railway/cli@5.8.0 variables

# QR de WhatsApp (abrir en Chrome)
https://luna-whatsapp-bridge-production.up.railway.app/qr

# Estado del bridge
https://luna-whatsapp-bridge-production.up.railway.app/   →  {"ok":true,"whatsappReady":true/false}
```
