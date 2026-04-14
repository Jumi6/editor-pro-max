#!/bin/bash
# ============================================================
#  Editor Pro Max — Pipeline completo de edición
#  Uso: ./scripts/pipeline.sh public/assets/video.mp4
# ============================================================
#
#  Pasos que ejecuta en orden:
#    1. Analiza el vídeo → public/video-metadata.json
#    2. Extrae el audio  → public/assets/audio.wav
#    3. Transcribe       → public/captions.json  (descarga modelo en 1ª ejecución ~1.5GB)
#    4. Detecta silencios→ public/silence.json
#
#  Después abre Remotion Studio y selecciona la composición "AIReel".

set -e  # Detener si cualquier paso falla

VIDEO=${1:-"public/assets/video.mp4"}

if [ ! -f "$VIDEO" ]; then
  echo ""
  echo "  ERROR: No se encontró el vídeo en: $VIDEO"
  echo ""
  echo "  Coloca tu vídeo en public/assets/ y ejecuta:"
  echo "    ./scripts/pipeline.sh public/assets/tu-video.mp4"
  echo ""
  exit 1
fi

echo ""
echo "  ╔══════════════════════════════════════╗"
echo "  ║   Atiendo365 · Editor Pro Max        ║"
echo "  ║   Pipeline de edición de vídeo       ║"
echo "  ╚══════════════════════════════════════╝"
echo ""
echo "  Vídeo: $VIDEO"
echo ""

# Asegurar que public/assets existe
mkdir -p public/assets

# ── Paso 1: Metadatos ───────────────────────────────────────
echo "  [1/4] Analizando vídeo..."
npx tsx scripts/analyze-video.ts "$VIDEO"
echo "  ✓ Metadatos guardados en public/video-metadata.json"
echo ""

# ── Paso 2: Extracción de audio ─────────────────────────────
echo "  [2/4] Extrayendo audio (16kHz mono WAV para Whisper)..."
npx tsx scripts/extract-audio.ts "$VIDEO"
echo "  ✓ Audio guardado en public/assets/audio.wav"
echo ""

# ── Paso 3: Transcripción con Whisper ───────────────────────
echo "  [3/4] Transcribiendo con Whisper.cpp..."
echo "        (La primera vez descarga el modelo medium.en ~1.5GB)"
npx tsx scripts/transcribe.ts
echo "  ✓ Subtítulos guardados en public/captions.json"
echo ""

# ── Paso 4: Detección de silencios ──────────────────────────
echo "  [4/4] Detectando silencios..."
npx tsx scripts/detect-silence.ts "$VIDEO"
echo "  ✓ Silencios guardados en public/silence.json"
echo ""

echo "  ════════════════════════════════════════"
echo "  ✅ Pipeline completado."
echo ""
echo "  Próximos pasos:"
echo "    1. npm run dev              → Abre Remotion Studio"
echo "    2. Selecciona 'AIReel'      → Tu composición de 1 minuto"
echo "    3. Activa captions y/o      → Edita los props en el panel"
echo "       removeSilence"
echo ""
echo "  Render final:"
echo "    npx remotion render AIReel out/reel.mp4"
echo "  ════════════════════════════════════════"
echo ""
