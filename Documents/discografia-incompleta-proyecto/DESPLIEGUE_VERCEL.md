# Despliegue en Vercel - Discografía Incompleta

## Opción 1: Deploy Automático (Recomendado)

### Paso 1: Verificar que el repositorio está en GitHub
```bash
cd ~/Documents/discografia-incompleta-proyecto
git remote -v
```

Si no está en GitHub, agrega el repositorio:
```bash
git remote add origin https://github.com/tu-usuario/discografia-incompleta.git
git branch -M main
git push -u origin main
```

### Paso 2: Conectar Vercel
1. Ve a https://vercel.com/
2. Sign up / Log in con GitHub
3. Click "Add New Project"
4. Selecciona el repositorio "discografia-incompleta"
5. Vercel detectará `vercel.json` automáticamente
6. Click "Deploy"

**URL resultado:** https://discografia-incompleta.vercel.app

---

## Opción 2: Deploy Manual (5 minutos)

1. Instala Vercel CLI:
```bash
npm i -g vercel
```

2. Deploy:
```bash
cd ~/Documents/discografia-incompleta-proyecto
vercel
```

3. Sigue las preguntas (autorizar, nombre del proyecto, etc.)

---

## ¿Qué se despliega?
- Solo la carpeta `build/` (contiene el HTML final compilado)
- El archivo `discografia-incompleta.html` es todo lo que necesitas
- No necesita servidor backend

## Archivos importantes
- `build/discografia-incompleta.html` ← Archivo principal (2.0 MB)
- `vercel.json` ← Configuración de despliegue
- `src/player.template.html` ← Plantilla (no se necesita en production)
