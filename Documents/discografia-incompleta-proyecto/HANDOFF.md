# Discografía Incompleta — Handoff

Trabajo universitario: página web interactiva que funciona como reproductor de música físico (mockup tipo Walkman/iPod). Cada track representa una etapa de la relación del usuario con la música y con su propósito. El sitio entrega un solo archivo HTML autocontenido (sin internet, sin dependencias) para descargar y proyectar.

**Todos los archivos de trabajo están en esta carpeta**, ya no dependen del scratchpad de sesión ni de `/tmp` (ambos son efímeros y se hubieran perdido):

```
discografia-incompleta-proyecto/
├── HANDOFF.md                          este archivo
├── build.py                            script reproducible: arma el HTML final
├── src/
│   ├── player.template.html            HTML + CSS (con placeholders /*__FONTS__*/ /*__PHOTOS__*/ /*__SCRIPT__*/)
│   └── player.js                       toda la lógica JS
├── assets/
│   ├── fonts/*.b64                     fuentes en base64 listas para inyectar
│   └── photos/out_*.b64 + out_*.png|jpg   fotos procesadas en base64 + originales procesados
└── build/
    ├── discografia-incompleta.html            build más reciente (regenerado recién)
    ├── discografia-incompleta-LAST-BUILD.html  build tal cual estaba al cortar la sesión anterior
    └── moodboard-referencia.html               las 3 direcciones visuales que se le mostraron al usuario (ronda 3)
```

**Para retomar:** editar `src/player.template.html` y/o `src/player.js`, correr `python3 build.py` desde esta carpeta, y abrir `build/discografia-incompleta.html` en el navegador (o servirlo con un HTTP server local si se necesita probar con Chrome DevTools — abrir como `file://` funciona pero algunas herramientas de preview automatizado lo tratan como snapshot estático).

---

## 0. ESTADO ACTUAL (2026-07-27) — diseño congelado, próximo paso es solo contenido

**El usuario confirmó explícitamente: no tocar más el diseño/código visual ni la mecánica.** Todo lo de las rondas 1 a 7 (ver abajo) queda como está — paleta, animaciones, ShapeBlur, GlassSurface, CardSwap, parallax, audífonos, auto-avance, todo. **Lo único que falta es reescribir el CONTENIDO/narrativa** (el usuario dijo textualmente que el texto actual "no lo convence mucho").

**Cómo se resuelve esto — ya existe la herramienta, no hay que programar nada nuevo:**
El build final ya tiene un modo de edición en vivo (ver sección 4ter, punto 6):
1. Abrir `build/discografia-incompleta.html` en el navegador.
2. Click en el botón "✎ editar texto" (esquina inferior derecha).
3. Todos los títulos, párrafos y tags de los 6 tracks + la intro quedan editables directamente haciendo click y escribiendo encima (contentEditable real, no hay que tocar código).
4. Click en "✓ listo" para salir del modo edición.
5. Click en "⬇ descargar html" para bajar un nuevo archivo con el texto ya cambiado.

**Qué hacer en la próxima sesión si el usuario pide ayuda con el contenido:**
- Si el usuario ya escribió el texto nuevo él mismo con el modo edición y solo quiere que se guarde/sincronice de vuelta al proyecto: pedirle el archivo exportado (`discografia-incompleta-editado.html`) y extraer el texto nuevo de ahí para actualizarlo también en `src/player.template.html` (así el `build.py` sigue siendo la fuente de verdad, no solo el HTML exportado suelto).
- Si el usuario quiere que el copy se escriba/reescriba en la conversación (pidiendo ideas, frases, ajustes de tono): editar directamente los `<p>` dentro de cada `.t-copy` y los `<h2>`/`.tag` en `src/player.template.html` (buscar por track, ej. `id="card-1"` a `id="card-6"`), y correr `python3 build.py` de nuevo. **No tocar nada de CSS ni JS a menos que el usuario lo pida explícitamente de nuevo** — el diseño está cerrado.
- El copy actual (por si hace falta como referencia de qué se está reemplazando) está documentado completo en la sección "1. Brief original" y en el HTML mismo.

---

## 1. Brief original (inmutable, viene del usuario)

Reproductor de música con 6 tracks, cada uno actúa/performa una etapa:

1. **"Demo, 2019"** (corregido después a **2023**, 18-19 años) — reproduce completo, sin cortes. Único trabajo que alguna vez terminó. Copy honesto, sin vergüenza.
2. **Track 2** — búsqueda de sonido inconclusa. La barra avanza normal y se detiene en seco a media reproducción, corte limpio y silencioso (decisión propia, no drama).
3. **Track 3** — igual que 2, otra búsqueda abandonada, mismo patrón.
4. **"Apertura Digital"** — quiebre visual fuerte y violento (a diferencia de 2/3 que es una elección propia, acá es una interrupción externa: el negocio de automatización que "tenía que salvarlo" y no funcionó, dejó de hacer música >1 año).
5. **"Sin título — fecha por definir"** — no existe todavía. Sensación de AUSENCIA: elementos de la interfaz vacíos/fantasma, silencio visual. El núcleo del propósito: la búsqueda sin resolución ES el propósito, no algo que la resuelva.
6. **"Cómo"** — la interfaz se RECONSTRUYE pero visiblemente distinta (otra paleta/composición), no un simple regreso a la normalidad. Copy: primero estabilidad económica para quitarle a la música la obligación de salvarlo, después retomar sin apuesta.

Dirección visual pedida desde el inicio: mucho movimiento, estética de reproductor pero cruda/vintage (no dashboard SaaS genérico), evitar el look "IA genérica" (nada de crema+terracota, nada de negro+neón único), paleta y tipografía con personalidad relacionada a audio análogo, sin fotos del usuario, navegación por scroll o clic en tracklist.

---

## 2. Historia de decisiones — qué se probó, qué se rechazó y por qué

### Ronda 1 — primer intento
Layout tipo dashboard: sidebar con tracklist + hero centrado + footer transport bar. Paleta ámbar/papel/tinta (#E8A33D), Archivo Black + Space Mono + EB Garamond.
**Rechazado:** "diseño tan horrible, completamente igual a uni genérico hecho con IA... letras genéricas, colores aburridos... no usaste ninguna skill". El usuario también corrigió el dato: el demo lo hizo a los 18-19 años (~2023), no a los 14 (2019).

### Ronda 2 — pivote a mockup físico
El usuario pidió explícitamente: que la página *sea* un reproductor físico (como Walkman o iPod) siempre presente en pantalla, con el contenido de cada track viviendo *dentro* de la pantalla del dispositivo, y que la pantalla se rompa progresivamente al bajar, con quiebre grande en el track de la crisis (Apertura Digital).
**Se construyó:** chasis físico (tornillos, bisel, botones prev/play/next reales, dial de volumen, reels de casete), pantalla como contenedor `overflow-y:auto` que scrollea internamente (`#screen`), sistema de grietas SVG con `stroke-dasharray`/`stroke-dashoffset` animado según scroll ratio + un "shatter" grande disparado por IntersectionObserver al entrar el track 4.
**Bugs reales encontrados y corregidos en esa ronda** (documentados por si reaparecen):
- El canvas de waveform se limpiaba al hacer `resize` sin volver a dibujar → arreglado agregando `wf.onResize = () => render(t)`.
- El SVG de grietas estaba DENTRO del contenedor que scrollea (`#screen`), así que se desplazaba con el contenido en vez de quedarse fijo sobre el "vidrio" → se movió como hermano de `#screen`, dentro de `.screen-bezel` (que no scrollea).
- `scrollTo({behavior:'smooth'})` nativo no funciona de forma confiable (broken en el entorno de testing headless, y en general es frágil combinado con `scroll-snap-type`) → se reemplazó por un tween manual con `requestAnimationFrame` (`smoothScrollTo()` en `player.js`), que además desactiva `scroll-snap-type` durante la animación (clase `.no-snap`) para que no pelee con el scroll nativo.
**Aceptado en esta ronda**, pero luego criticado en la ronda 3 igual: paleta rust/negro/hueso, tipografía Archivo Black/EB Garamond.

### Ronda 3 — "sigue viendo genérico"
El usuario mandó capturas señalando específicamente el patrón de "eyebrow label" (texto pequeño en mayúsculas trackeado arriba del título) + línea vertical decorativa como el típico "tell" de diseño hecho por IA. Pidió: research real de teoría/psicología del color, cuarto de fondo realista con guitarra Les Paul negra, vinilos, tornamesa y audífonos, texto más corto, grietas realmente progresivas (no visibles desde el inicio).

**Se hizo:**
- **Research real** (no solo criterio propio): se navegó reactbits.dev y 21st.dev de verdad, y se confirmó que la skill instalada `design-ui-ux-pro-max` tiene paletas de producto SaaS genérico (violeta/índigo/verde, tokens tipo shadcn) — inútil para esto, se descartó como fuente.
- **Mood board real** (3 direcciones con paleta/tipografía/textura reales, no solo descripción) publicado como Artifact y mostrado al usuario antes de reconstruir — evitó una cuarta ronda de rechazo a ciegas. El usuario eligió la **Dirección 1 — "cinta rayada"**: negro cálido + rojo-óxido, tipografía dot-matrix + stencil industrial, manteniendo el mockup físico.
- **Tipografía nueva:** `DotGothic16` (dot-matrix, para títulos de track) + `Big Shoulders Stencil` (números grandes con `-webkit-text-stroke`, sin relleno) + `Space Mono` (todo lo demás). Se sacó Archivo Black y EB Garamond por completo.
- **Sistema de color por track** (psicología del color real, split-complementario en vez de monocromático): variable CSS `--acc` en `:root`, redefinida por `body[data-accent="..."]`. Ver sección 3 para valores exactos actuales.
- **Composición asimétrica:** número grande tipo sello (`.t-head .stamp`, contorno con `-webkit-text-stroke`, rotado), título rotado levemente, "tag" final de cada track como pill estampado y rotado — reemplaza el eyebrow-label genérico.
- **Fotos reales del cuarto:** sin generador de imágenes IA disponible en el entorno, se buscaron y descargaron fotos de licencia libre en **Wikimedia Commons** (vía su API pública `commons.wikimedia.org/w/api.php`, no scraping) y se procesaron con Python/PIL:
  - Guitarra: `File:Jimmy Page's "Black Beauty" 1960 Gibson Les Paul Custom... MET...jpg` (CC, foto de museo sobre fondo blanco → se le hizo cutout de fondo blanco a transparente con un umbral de distancia-a-blanco por píxel + blur de 1-1.2px en el alpha para suavizar el borde).
  - Vinilos: `File:Vintage vinyl records (Unsplash).jpg` (CC0).
  - Tornamesa: `File:Technics turntable, Ottobrunn (P1046342).jpg` (CC BY-SA).
  - Audífonos: `File:Beyerdynamic DT 990.jpg` (CC BY-SA) — el primer candidato (Sennheiser hd-25) estaba borroso/mal iluminado, se descartó.
  - **Nota de licencia pendiente de resolver con el usuario:** las fotos son de uso libre pero CC BY / CC BY-SA técnicamente piden crédito. Se le ofreció agregar una placa de créditos discreta en el dispositivo o ponerlo aparte en la entrega — **el usuario todavía no respondió eso**.
- **Texto recortado** a una sola frase corta por track (antes eran 2 párrafos por track).
- **Grietas progresivas de verdad:** el bug real era que el primer umbral de aparición (`threshold`) estaba tan cerca de 0 que se dibujaba parcialmente ya en el scroll inicial. Se resolvió separando los umbrales a lo largo de todo el recorrido real (0.30 a 0.90) y achicando la ventana de aparición de cada grieta (`Math.min(0.05, threshold)` en vez de `0.09`). Se agregó una tercera línea de "glint" (brillo) además de sombra+línea base para que el vidrio se vea más real.

**El usuario aprobó esta versión con una sola objeción:** "se ve demasiado opaco" → se reprocesaron las fotos con menos oscurecimiento/vignette, más brillo/contraste/nitidez (unsharp mask), opacidad casi al 100% en vez de .7-.85, y se corrigió un bug de capas donde `.room-floor` se pintaba ENCIMA de la tornamesa y los audífonos en vez de detrás (se reordenó el HTML). El usuario confirmó que esa corrección se veía mejor.

### Ronda 4 — feedback más grande y aún sin resolver del todo (donde quedó la sesión)
Mensaje largo y compuesto del usuario, con **5 pedidos simultáneos**, más 2 referencias de código completas (componentes React Bits `CardSwap` y `CircularGallery`) pidiendo que la navegación entre tracks se sienta como "elegir una canción nueva de una biblioteca virtual de vinilos". Detalle exacto de cada punto y su estado real al cortar la sesión, en la sección 4.

---

## 3. Estado exacto del código ahora mismo

### Paleta (en `src/player.template.html`, bloque `:root` cerca de la línea 10-38)

Recién actualizada en esta sesión a colores **más vivos/saturados** — el usuario había dicho que la versión anterior (rust apagado #E3491C / teal apagado #5B8C7A) se sentía "opaca". **Esto está cambiado en el código pero todavía NO se probó visualmente en el navegador** — es lo primero que hay que hacer al retomar.

```css
--acc:#FF5A1F;        /* tracks 1-3: tangerina vívida (antes #E3491C, más apagado) */
--acc-dim:#7A2C0E;
--acc-glow:rgba(255,90,31,.9);
--paper:#F5EFE4;
--paper-dim:#9B9080;
--screen-bg:#120F0C;

body[data-accent="alarm"]{ --acc:#FF2050; ... }   /* track 4: carmesí vívido, antes #D42020 */
body[data-accent="void"]{  --acc:#CFC7B8; ... }   /* track 5: gris pálido, antes #8F8578 (se sentía "sucio") */
body[data-accent="teal"]{  --acc:#2FE6A8; ... }   /* track 6: verde-menta vivo, antes #5B8C7A */
```

El JS (`src/player.js` línea 47-49) ya tiene el mismo cambio reflejado para los colores del canvas (waveform):
```js
var COLOR_AMBER = "#FF5A1F", COLOR_OFF = "rgba(245,239,228,0.14)";
var ACCENT_HEX = {1:"#FF5A1F",2:"#FF5A1F",3:"#FF5A1F",4:"#FF2050",6:"#2FE6A8"};
```

**Pendiente:** correr `python3 build.py` y mirarlo en el navegador. Es posible que estos colores ahora se sientan *demasiado* saturados/neón contra el negro — hay que juzgarlo con la imagen real, no solo el hex.

### Sistema de acento por track (mecanismo, no cambia)
`body[data-accent]` se setea en `setActive(id)` (`player.js` línea ~331-345) vía un mapa `{1:"",2:"",3:"",4:"alarm",5:"void",6:"teal"}`. El track 6 además dispara `body[data-theme="rebuilt-active"]` para cambiar el fondo/chasis a la variante fría (`--chassis-hi/1/2`, `--screen-bg-r`, `--paper-r`).

### Cuarto de fondo (fotos)
CSS en `player.template.html` líneas ~76-121 (clases `.prop-guitar`, `.prop-turntable`, `.prop-vinyl`, `.prop-headphones`, `.prop-cassette`). Ahora mismo estas fotos están **nítidas, en foco, casi 100% opacas** (así se corrigió en la ronda 3). El pedido más reciente del usuario (ronda 4, punto 4 abajo) es EMPUJARLAS de nuevo hacia atrás con desenfoque real (profundidad de campo tipo foto con bokeh), **no volver a la opacidad baja de antes** — son pedidos distintos aunque suenen parecidos. Esto quedó identificado pero sin aplicar.

Las imágenes están embebidas como `background-image:var(--img-guitar)` etc., definidas en `:root` vía el placeholder `/*__PHOTOS__*/` que llena `build.py` leyendo `assets/photos/out_*.b64`.

### Sistema de grietas (`player.js` líneas 143-225 aprox.)
- `buildCracks()`: genera 8 líneas "hairline" con jitter aleatorio (seed fija `mulberry32(77)`, reproducible) + un grupo de grietas "burst" (8 líneas radiales desde el centro de la pantalla) para el quiebre grande.
- `onScreenScroll()`: recalcula `ratio = scrollTop / (scrollHeight - clientHeight)` en cada scroll y dibuja cada hairline progresivamente según su `threshold` individual (array `hairlines` en `buildCracks()`, con thresholds repartidos 0.30 a 0.90).
- `fireShatter()`: se dispara una sola vez (`shatterFired` flag) cuando el track 4 se vuelve activo (`data-shatter="true"` en su `<section>`), anima cada línea del burst con un pequeño delay escalonado + sacude la pantalla (`.screen-shake`) + flash blanco (`.screen-flash.hit`).
- **Esto sigue atado a scroll continuo, no a la narrativa por track** — es exactamente el punto 3 pendiente de la ronda 4 (ver abajo).

### Navegación actual
- `.idx-row`: fila de 7 botones finitos (uno por página: intro + 6 tracks) mostrados como barras horizontales delgadas, sticky arriba de la pantalla. Click llama a `gotoPage(id)`.
- Botones físicos del chasis `#btn-prev` / `#btn-play` / `#btn-next` en `initNav()` (`player.js` línea ~430).
- Esto es lo que el usuario quiere **reemplazar** por una interacción tipo "crate de vinilos" (punto 4 de la ronda 4, el cambio más grande pendiente).

---

## 4bis. Ronda 5 (2026-07-26) — los 5 puntos de la ronda 4 + placa de créditos, todo aplicado y verificado en navegador

Se implementaron y se probaron los 6 tracks de punta a punta con el Browser tool (screenshots reales, no solo código):

1. **Colores vivos** — verificados en navegador, se ven bien contra el negro, no sobresaturados.
2. **Placa de créditos discreta** — agregada como `.credits-plate` en `player.template.html` (línea cerca de `.chassis-bottom`), texto de atribución CC de Wikimedia Commons a `.34rem`/opacidad `.38`, casi ilegible a simple vista pero presente en el DOM/render — resuelve el pendiente de licencias que quedó abierto en la ronda 3.
3. **Blur/profundidad de campo del cuarto** — aplicado `filter:blur(3-3.5px)` + `drop-shadow` combinados, opacidad bajada a .85-.9 (no tan baja como el rechazo de ronda 3), y `scale(1.08-1.1)` en guitarra/tornamesa/vinilos/audífonos. Verificado: se ve como fondo con foco de cámara real, no como decoración plana.
4. **Grietas atadas a narrativa por track** — reescrito en `player.js`: `crackGroupsByTrack = {2:[0,1], 3:[2,3], 5:[4,5], 6:[6,7]}` + función `revealCracksForTrack(id)` llamada desde el `IntersectionObserver` (reemplazó `onScreenScroll()` y el listener de scroll continuo, que se eliminaron). Cada grieta ahora anima su propio `stroke-dashoffset` con transición suave (900ms) solo cuando ese track se activa por primera vez. El shatter grande del track 4 (`fireShatter()`) se dejó intacto y sigue siendo instantáneo/violento. Verificado: track 1 sin grietas, 2 y 3 suman grietas nuevas, 4 tiene el quiebre grande, y la cicatriz completa queda visible permanentemente sobre el "vidrio" en 5 y 6 (el SVG de grietas es hermano de `#screen`, no scrollea con el contenido, así que el daño físico se acumula y se ve en cualquier track posterior — es un efecto correcto, no un bug).
5. **Navegación tipo "crate de vinilos"** — reemplazó `.idx-row` (las barritas) por `.crate-row` con 7 `.sleeve` (fundas de disco apiladas, superpuestas con `margin-right` negativo). La funda activa crece (`scale(1.2)`), se levanta (`translateY(-6px)`) y muestra su número; al cambiar de track, la funda saliente se anima con la clase `.leaving` (cae/rota/se achica) y la entrante con `.entering` + keyframe `sleevePop` (overshoot elástico, aproximando el "elastic.out" de GSAP con `cubic-bezier` puro, sin dependencias). Los tracks 4/5/6 tienen su acento de color propio en la funda vía `[data-accent]` aunque no estén activos. Implementado 100% en vanilla JS/CSS, sin GSAP ni React — mantiene el archivo único offline. Verificado: la animación de swap se ve y se siente bien en las 6 transiciones.
6. **Bonus no pedido explícitamente pero mencionado como idea (punto 5 de la ronda 4):** disco de vinilo (`#vinyl-spin`) que aparece y gira sobre la tornamesa cuando cualquier track está reproduciendo (`anyTrackPlaying()` chequeado en `startTrack`/`stopLoop`). Verificado visualmente: el disco aparece con el label del color de acento del track activo.

**Cómo se verificó:** build reproducido con `python3 build.py`, servido con `python3 -m http.server` en `build/`, abierto con el Browser tool, y recorrido con los botones prev/next reales (no solo mirando capturas) — se vieron los 6 tracks + intro, incluyendo el shatter del track 4 en pleno flash blanco y la transición de tema frío del track 6.

**Sigue pendiente / posible pulido futuro (nada bloqueante):**
- Doble click rápido en prev/next antes de que el scroll/IntersectionObserver asiente puede saltar tracks de forma inconsistente (limitación preexistente de acoplar los botones de hardware a `activeTrackId`, que solo se actualiza vía scroll — no es un bug introducido en esta ronda, ya existía en el diseño original).
- No se tocó el layout mobile (`@media(max-width:760px)` sigue ocultando las props del cuarto) — no fue parte del pedido.

---

## 4ter. Ronda 6 (2026-07-26) — pivote grande: sin React Bits literal, portado a vanilla, sin "roto", editable

El usuario pegó el código fuente completo de 4 componentes de **React Bits** (`CardSwap`, `ShapeBlur`, `GlassSurface`, `ModelViewer`) pidiendo integrarlos, más: quitar el look "roto" (las grietas), colores vivos (dijo textualmente "detesto los colores que usaba"), y que todo sea "completamente editable porque la narrativa no me gusta".

**Decisión de arquitectura (confirmada con el usuario antes de tocar código, ver preguntas de esa sesión):**
1. Mantener un solo archivo HTML sin dependencias — se portó la lógica de cada componente a JS/CSS vanilla en vez de usar React + npm. Esto significa que **no es literalmente el código que pegó el usuario**, es una reimplementación fiel sin React/GSAP/R3F.
2. Para el "iPod realista con movimiento de ModelViewer": no había modelo 3D (.glb) ni se iba a salir del archivo único, así que se simuló el movimiento (parallax al mover el mouse + arrastrar para rotar + inercia) con CSS 3D transforms sobre el chasis existente, sin geometría 3D real.
3. "Completamente editable" se resolvió como un modo de edición en vivo en el navegador (botón "✎ editar texto"), no como un bloque de config en el código.

**Qué se implementó (todo verificado en navegador, no solo en código):**

- **ShapeBlur → fondo.** Se vendorizó `three.min.js` (r160, UMD, ~670KB) inline en el HTML (`assets/vendor/three.min.js`, inyectado por `build.py` vía `/*__THREEJS__*/`). Se portó el shader (vértex/fragment) tal cual, con un cambio: se agregó `uniform vec3 u_color` en vez del blanco fijo del original, para poder pintarlo con el color de acento activo (cambia cuando cambia el track). El canvas está fijo a pantalla completa detrás del dispositivo, con `filter:blur(38px)` en CSS para el efecto ambient/glow, y sigue al mouse en tiempo real. **Esto reemplazó por completo el fondo de fotos del cuarto** (guitarra/tornamesa/vinilos/audífonos de Wikimedia Commons) — ya no están. Como consecuencia, **la placa de créditos CC ya no es necesaria y se quitó** (no hay fotos que acreditar).
- **GlassSurface → vidrio de la pantalla.** Portado 100% a vanilla (SVG `feImage`/`feDisplacementMap`/`feColorMatrix`/`feBlend` generado por JS + `backdrop-filter` con fallback para Safari/Firefox, igual que el original). Reemplaza el viejo overlay de scanlines + grietas. Da un vidrio real, no roto.
- **Sistema de grietas eliminado por completo** (`buildCracks`, `revealCracksForTrack`, `fireShatter`, el `<svg class="crack-svg">`) — ya no hay nada "roto". El momento dramático del track 4 ("Apertura Digital") ahora es un glitch de aberración cromática + sacudida + flash (`triggerGlitch()`), no vidrio quebrado.
- **Paleta nueva, vívida:** coral eléctrico `#FF3B6B` (tracks 1-3), naranja-rojo `#FF3D1F` (crisis, track 4), gris-hielo `#B9C6CE` (ausencia, track 5), cian-menta `#22E6D0` (reconstrucción, track 6). Chasis pasó de plástico marrón cálido a metal gris-violáceo frío, con un `::after` de "sheen" (brillo diagonal tipo metal cepillado) que se mueve según la inclinación 3D.
- **CardSwap → navegación principal.** Se reemplazó el scroll-snap de páginas verticales por un stack de `.track-card` posicionadas absolutamente con `translate3d`+`skewY` (imitando `makeSlot` del original), profundidad visual con blur/opacidad decrecientes. `goTo(targetId)` anima: la card activa "cae" (drop), las demás (incluida la elegida) se promueven a sus nuevos slots con stagger y un cubic-bezier con overshoot (aproximando `elastic.out` sin GSAP), y la que salió vuelve al fondo de la pila — igual que el mecanismo real de CardSwap pero generalizado para saltar a cualquier track (no solo ciclar al siguiente). La fila de "sleeves" (crate de vinilos) de la ronda anterior se mantuvo como índice rápido arriba, ahora llamando a `goTo()`.
- **iPod realista + movimiento:** chasis con gradientes más metálicos + `initDeviceMotion()` en `player.js` — tilt 3D sutil siguiendo el mouse (parallax, ±7°), y arrastrar con el mouse/dedo rota el dispositivo con más rango (±48°/±32°) e inercia al soltar (fricción `*0.92` por frame), volviendo suavemente al rango de reposo. Todo con CSS `transform:rotateX()/rotateY()` sobre `--tiltX`/`--tiltY`, sin Three.js ni modelo 3D.
- **Modo edición + exportar:** botón "✎ editar texto" activa `contenteditable` en todos los títulos/párrafos/tags narrativos (selector `EDITABLE_SELECTOR` en `player.js`); botón "⬇ descargar html" clona `document.documentElement`, lo serializa y dispara la descarga de un nuevo `.html` con los cambios ya incluidos (todo client-side, sin servidor). El usuario puede reescribir toda la narrativa él mismo sin volver a pedir cambios de texto.

**Verificado en navegador (Browser tool, no solo mirando código):** intro → track1 (autoplay al entrar), salto directo track1→track4 vía sleeve (con glitch), track6 con tema frío reconstruido, parallax al mover el mouse, arrastre para rotar con inercia, modo edición activando `contenteditable` real (confirmado con `document.execCommand`), y el HTML exportado contiene el texto editado + three.js inline (verificado programáticamente el tamaño y contenido del `outerHTML` clonado). Sin errores de consola (solo un warning inofensivo de three.js sobre que el build UMD está deprecado desde r150, no afecta funcionamiento).

**Tamaño del build:** bajó de ~1.4MB a ~835KB al sacar las fotos (aunque se sumó three.js ~670KB sin comprimir extra — el archivo sigue siendo perfectamente manejable para entregar).

**Pendiente / no bloqueante:**
- El overlap visual entre el "sello" numérico grande (`.stamp`) y el texto pequeño `01/06 — hh:mm` en el header de cada card es un detalle heredado de rondas anteriores, no tocado en esta ronda.
- No se generó un modelo 3D real ni se migró a React — decisión explícita del usuario en esta sesión.

**Bug encontrado y corregido el mismo día (después de que el usuario probara el build):** el `.glass-cover` (GlassSurface) cubría TODA la pantalla con blur, no solo el borde — el texto del centro (títulos, copy) quedaba ilegible/borroso. Causa: el backdrop-filter (tanto la ruta SVG real como el fallback de Safari/Firefox) se aplicaba sin ninguna máscara sobre el contenido completo. Arreglado con una `mask-image: radial-gradient(...)` en `.glass-layer` que deja el centro completamente transparente (sin filtro) y solo aplica el efecto de vidrio cerca del borde de la pantalla; además se bajaron los valores de blur/distortionScale/opacity tanto del fallback como de los parámetros por defecto de `initGlassSurface()` en `player.js`. Si en el futuro el vidrio se ve borroso otra vez, revisar primero esa máscara y esos valores antes de tocar cualquier otra cosa.

**Nota de flujo de entrega:** el usuario visualiza esta conversación en un cliente donde el panel de archivos adjuntos abre HTML como código fuente (vista de editor), no como página renderizada — no es un bug del archivo. La forma confiable de previsualizar el build es decirle que lo abra directamente desde Finder (`open -R` en Bash deja la carpeta abierta y el archivo seleccionado) con doble clic, no a través del visor de archivos del chat.

**Bug crítico encontrado y corregido el mismo día — el dispositivo no se podía usar en absoluto:** `initDeviceMotion()` (arrastrar para rotar el chasis, ronda 6) llamaba `device.setPointerCapture()` en CUALQUIER `pointerdown` sobre `#device`, sin umbral de movimiento. Como todos los botones (play, sleeves, prev/next, mini-play) están DENTRO de `#device`, esto secuestraba el puntero apenas se tocaba cualquier botón, y en la práctica ningún clic real de usuario llegaba a registrarse — quedabas trabado en la pantalla de intro para siempre, viendo "solo la interfaz sin info" (así lo describió el usuario, sin saber que era un bug de captura de puntero). Se corrigió agregando un patrón "decide" (igual al que usa el propio `ModelViewer` que pegó el usuario para touch): en `pointerdown` se marca `pending=true` pero NO se captura el puntero; solo si el desplazamiento supera `DRAG_THRESHOLD=6px` en `pointermove` recién ahí se activa `dragging=true` y se llama `setPointerCapture`. Un clic normal (sin arrastrar) nunca llega a ese umbral, así que el `click` nativo del botón se dispara sin interferencia. **Importante para el futuro:** los clics simulados vía `elemento.click()` en JS SIEMPRE funcionan (bypasean el hit-testing y los manejadores de puntero), así que no sirven para detectar este tipo de bug — hay que probar con clics reales de mouse/touch (o pedirle al usuario que abra el archivo) antes de dar por buena cualquier interacción que dependa de eventos de puntero.

---

## 5. Ronda 7 (2026-07-26/27) — más interactividad en el fondo, audífonos de cable, auto-avance, y un bug crítico de congelamiento

El usuario pidió: (1) más interactividad/tamaño en el fondo + volver a traer guitarra/tornamesa/audífonos; (2) audífonos que sobresalgan del propio dispositivo con el mismo efecto 3D; (3) que los tracks avancen solos con el tiempo en vez de depender de apretar "siguiente" o buscar en las sleeves (pidió esto pegando de nuevo el código de `CardSwap`, cuyo demo hace auto-avance con `setInterval`). Después, ya viendo el resultado, pidió dos ajustes más: que las fotos del fondo se sientan menos sueltas/desconectadas, y que los audífonos del dispositivo sean de cable normal (no de diadema).

**Se implementó:**
- **Props de vuelta** (`assets/photos/*.b64`, nunca se habían borrado del disco aunque se había sacado su uso) + `build.py` vuelve a inyectarlas vía `/*__PHOTOS__*/`. Se agregaron con `mouse-parallax` real: cada prop está envuelto en un `.prop-parallax[data-depth]`, y `initRoomParallax()` en `player.js` mueve cada wrapper según la posición del mouse, con profundidad distinta por elemento (más movimiento = más "cerca" percibido).
- **Cohesión del fondo:** se agregó `.room::before`, un glow radial usando `var(--acc-glow)` (el mismo color de acento del track activo) detrás de todos los props — ahora el fondo entero se tiñe con el color de la narrativa en curso en vez de sentirse como 4 fotos sueltas. También se acercaron un poco las posiciones de los props entre sí (antes estaban pegados a los bordes/esquinas extremas).
- **Placa de créditos CC** restaurada (necesaria de nuevo porque las fotos volvieron).
- **Audífonos en el propio dispositivo:** primer intento fue una diadema con dos auriculares grandes (rechazado por el usuario — "no que ocurran/cubran toda la cabeza"). Se reemplazó por `.device-earbuds`: un SVG con dos paths curvos simulando el cable, más dos `.eb-bud` (cápsulas alargadas) colgando a distinta altura — el look de unos earbuds de cable normales colgando del borde superior izquierdo del chasis. Sigue siendo hijo de `#device`, con `translate3d(...,44px)` para sobresalir en 3D y heredar el tilt/parallax del dispositivo igual que antes.
- **Auto-avance de tracks:** `AUTO_DELAY=6800` ms, función `scheduleAuto(id)` que se reprograma sola en cada `goTo()` (manual o automático), se detiene en el track 6 (no hace loop de vuelta a 0/1), y se pausa mientras el modo edición está activo (`editingActive`).

**Bug crítico encontrado en esta misma ronda — la interfaz quedaba totalmente congelada:**
El sistema de navegación (`goTo()`) usaba una bandera booleana `swapping` que se ponía en `true` al iniciar una transición y solo volvía a `false` al final de una cadena de `setTimeout` (900ms después). Si esos timeouts se retrasaban o nunca llegaban a disparar limpiamente (ocurrió en pruebas con la pestaña en segundo plano, pero un usuario real alt-tabeando en medio de una transición corre el mismo riesgo), `swapping` quedaba en `true` para siempre y **todo clic futuro se ignoraba en silencio, sin ningún error en consola** — el usuario quedaba trabado viendo solo la pantalla de intro, exactamente lo que describió como "no tiene nada de info, esa es la mera interfaz".

**Corregido con dos cambios:**
1. Se eliminó la bandera `swapping` por completo. `goTo()` ahora actualiza el array lógico `order` de forma **síncrona e inmediata** al ser llamado — nunca depende de que una animación previa termine para poder aceptar la siguiente navegación. La animación visual (los `setTimeout` escalonados) sigue existiendo, pero es puramente cosmética y ya no bloquea nada.
2. Como consecuencia de lo anterior, dos llamados a `goTo()` pueden solaparse en el tiempo (ej. el auto-avance dispara justo cuando el usuario hace clic manual). Se agregó un token `transitionSeq`: cada `goTo()` toma un número de secuencia al empezar, y cada callback de `setTimeout` escalonado chequea si su secuencia sigue siendo la vigente antes de tocar el DOM — si una transición más nueva ya arrancó, la vieja se auto-cancela en vez de pisar el estado visual correcto. Esto también arregló un segundo bug relacionado: la card que dejaba de ser "frente" nunca perdía la clase `.card-front` (ni por lo tanto `pointer-events:auto`), así que con el tiempo quedaban varias cards clicables simultáneamente — ahora se le saca esa clase apenas se decide reemplazarla.

**Cómo se verificó esta vez (importante para el futuro):** dado que el `wait` del Browser tool y la latencia real entre llamadas de herramienta no coinciden necesariamente con segundos reales del navegador, verificar timers con múltiples llamadas separadas de `javascript_exec`/`screenshot` da lecturas engañosas (parecía haber "saltos" imposibles de varios tracks). La forma confiable fue escribir un solo script que hace polling interno con `setTimeout` + `Promise` y devuelve un log con timestamps de `performance.now()`, todo en una sola llamada a `javascript_exec` — así se pudo confirmar con precisión que el auto-avance ocurre cada ~6.8s, que nunca hay dos cards con `.card-front` a la vez, y que se detiene limpiamente en el track 6.

---

## 4. Pedido de la ronda 4 — textual, interpretado, y estado real

El usuario escribió (resumen fiel, no textual completo): *"No me gusta, se ve demasiado animado, quiero otros colores porque se me hacen muy opacos, quiero animaciones, quiero los fondos donde están las demás cosas atrás, quiero que sea progresivo cómo se rompe pero que siga teniendo narrativa — la narrativa que tiene no me gusta en lo absoluto —, también siento que se sigue viendo genérico, sin movimiento, sin acciones mayores, se ve insípido. Quiero que el cambio de track sea como si estuviera eligiendo una canción nueva de una biblioteca virtual de vinilos, con diseño y animación como esto: [pega el código fuente completo de dos componentes de React Bits: `CardSwap` (stack de cards con GSAP, timeline drop/promote/return, efecto elástico) y `CircularGallery` (carrusel curvo en WebGL vía la librería `ogl`, con scroll/drag)]. Entonces haz cambios y me muestras."*

Interpretación y plan que se había armado (ninguno ejecutado todavía salvo el punto 1):

1. **Colores más vivos** — ✅ código cambiado (ver sección 3), ⏳ sin verificar en navegador.

2. **Cuarto empujado atrás, con blur real (profundidad de campo)** — ⏳ identificado el bloque CSS exacto (líneas 76-121 de `player.template.html`), no aplicado. Plan concreto: agregar `filter: blur(3-5px)` a `.prop-guitar/.prop-turntable/.prop-vinyl/.prop-headphones` (combinado con el `drop-shadow` que ya tienen — usar `filter: blur(Npx) drop-shadow(...)` en una sola declaración), reducir opacidad levemente (no volver a los valores bajos de la ronda 3 inicial, algo intermedio ~0.85-0.9), y opcionalmente escalar un poco hacia arriba (`transform: scale(1.05-1.1)`) para vender el efecto de "está más cerca de la cámara pero desenfocado" en vez de "está lejos y chico".

3. **Grietas atadas a la narrativa por track, no a scroll continuo** — ⏳ no iniciado. Plan concreto: mover el trigger de grietas de `onScreenScroll()` (ratio continuo de scroll) a `setActive(id)` (que ya se llama en cada cambio de track vía el `IntersectionObserver` en `initObserver()`). Idea: nada de grietas en tracks 1, una grieta pequeña nueva al entrar a track 2, otra al entrar a track 3, el shatter grande ya existente al entrar a track 4 (sin cambios ahí), y quizás 1-2 grietas adicionales pequeñas al entrar a track 5/6 para reforzar que la cicatriz sigue creciendo incluso después de la crisis. Esto hace que cada grieta tenga una razón narrativa clara ("cada intento fallido deja una marca") en vez de aparecer por una función continua de scroll que no comunica nada por sí sola — que es probablemente lo que el usuario quiso decir con "la narrativa que tiene no me gusta".

4. **Navegación tipo "crate de vinilos" (el cambio más grande, no iniciado en absoluto)** — reemplazar `.idx-row` (las barritas finitas actuales) por un selector de "sleeves" (fundas de disco) apiladas en diagonal, uno por track, con animación elástica al cambiar de track: la funda activa "cae" y sale, las demás se promueven un lugar hacia adelante, la que salió vuelve al fondo de la pila — literalmente la mecánica de `CardSwap` que pegó el usuario, pero re-implementada a mano en JS/CSS vanilla (sin React ni GSAP como dependencia, para no romper el requisito de archivo único offline). GSAP es MIT y se podría embeber inline si se decide que vale la pena el peso extra (~70kb) para lograr el mismo timing elástico exacto del ejemplo; si no, se puede aproximar con `transition: transform .6s cubic-bezier(.22,1.6,.36,1)` (un cubic-bezier con overshoot simula bastante bien el "elastic.out" de GSAP sin la librería).
   - Se descartó portar `CircularGallery` porque depende de la librería WebGL `ogl` (no disponible offline, y el shader/cámara 3D es una complejidad grande para el beneficio) — pero el usuario mandó las dos opciones ("o esto"), así que si `CardSwap` no lo convence al verlo, `CircularGallery` sigue siendo una alternativa a considerar, solo que más cara de construir.
   - Cada "sleeve" debería mostrar: número de track (stencil), color de acento correspondiente (el sistema de la sección 3), quizás una miniatura del waveform. Al hacer clic en una sleeve, o al usar los botones físicos prev/next, dispara la animación de swap Y navega (`gotoPage`) al track correspondiente — unificando lo que hoy son dos sistemas separados (`.idx-row` + botones de hardware).

5. **Sensación general "insípida/genérica/sin acciones mayores"** — se espera que se resuelva en gran parte con el punto 4 (la navegación es hoy la parte más plana/funcional de la experiencia). Ideas adicionales que quedaron mencionadas pero no desarrolladas: un disco de vinilo girando de verdad (overlay animado) sobre la foto de la tornamesa cuando hay un track "reproduciéndose" (`t.playing === true`), para que el cuarto de fondo también reaccione al estado del reproductor y no sea solo decoración estática.

---

## 5. Cómo retomar — orden recomendado

1. Abrir esta carpeta, correr `python3 build.py`, abrir `build/discografia-incompleta.html` en el navegador y mirar los colores nuevos (punto 1) antes de nada — puede que ya estén bien, o puede que se pasen de saturados.
2. Aplicar el blur/profundidad de campo al cuarto (punto 2) — es rápido, 15-20 min.
3. Mover las grietas a estar atadas a `setActive()` en vez de al scroll continuo (punto 3) — rápido también.
4. Construir el selector tipo crate de vinilos (punto 4) — es el grueso del trabajo que queda, probablemente 1-2 horas de iteración real con el navegador abierto para que el timing de la animación se sienta bien.
5. Recién ahí volver a armar el build final, probar los 6 tracks de punta a punta en el navegador (no solo mirar capturas — usar `mcp__Claude_Browser__javascript_tool` para saltar de track en track y `computer` screenshot para revisar cada uno, como se hizo en rondas anteriores), y entregar.

**Nota técnica para la próxima sesión sobre cómo probar esto:** abrir el archivo como `file://` directo funciona para inspección visual pero algunas herramientas de preview automatizado lo tratan como snapshot estático sin JS interactivo. Lo que sí funcionó de forma confiable en esta sesión: levantar un server HTTP local simple (`python3 -m http.server` con un handler que fija el directorio explícitamente, ya que el `--directory` de la CLI dio error de permisos en este entorno) y navegar a `http://localhost:PUERTO/...` con el Browser tool. Un script de referencia para ese server quedó documentado en el historial de esta sesión si hace falta reconstruirlo.

**Nota sobre licencias de las fotos:** pendiente confirmar con el usuario si quiere una placa de créditos discreta en el dispositivo (CC BY / CC BY-SA piden atribución) o si lo va a resolver aparte en su entrega.
