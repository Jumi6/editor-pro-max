#!/usr/bin/env npx tsx
/**
 * Editor Pro Max — Panel interactivo para Juanma Salmerón / Atiendo365
 *
 * Flujo completo en un solo comando:
 *   npx tsx scripts/editor.ts
 *   npx tsx scripts/editor.ts public/assets/mi-video.mp4
 *
 * Lo que hace:
 *   1. Te pide (o acepta como argumento) la ruta al vídeo
 *   2. Copia el vídeo a public/assets/video.mp4
 *   3. Corre el pipeline (transcripción + detección de silencios)
 *   4. Te pregunta en lenguaje natural qué quieres hacer
 *   5. Usa Claude Code (el `claude` que tienes en la terminal) para generar los props
 *   6. Escribe src/edit-config.ts con los props generados
 *   7. Abre Remotion Studio para que veas el resultado
 *
 * Requisitos:
 *   - Node.js 20+, npx tsx, npm install hecho
 *   - Claude Code instalado y autenticado (si puedes ejecutar `claude`, estás listo)
 */

import {
  existsSync,
  copyFileSync,
  mkdirSync,
  writeFileSync,
} from "fs";
import {createInterface} from "readline";
import {execSync, spawn} from "child_process";
import path from "path";

// ─── Helpers ────────────────────────────────────────────────────────────────

const rl = createInterface({input: process.stdin, output: process.stdout});
const ask = (question: string): Promise<string> =>
  new Promise((resolve) => rl.question(question, resolve));

function banner(title: string) {
  console.log("");
  console.log("  ╔══════════════════════════════════════╗");
  console.log(`  ║  ${title.padEnd(36)}║`);
  console.log("  ╚══════════════════════════════════════╝");
  console.log("");
}

function step(n: number, total: number, msg: string) {
  console.log(`  [${n}/${total}] ${msg}`);
}

function ok(msg: string) {
  console.log(`  ✓ ${msg}`);
}

function info(msg: string) {
  console.log(`  ${msg}`);
}

function hr() {
  console.log("  ────────────────────────────────────────");
}

// ─── Config ─────────────────────────────────────────────────────────────────

const EDIT_CONFIG_PATH = path.join(process.cwd(), "src", "edit-config.ts");
const PUBLIC_ASSETS = path.join(process.cwd(), "public", "assets");
const TARGET_VIDEO = path.join(PUBLIC_ASSETS, "video.mp4");

// ─── Verificar que Claude Code está disponible ───────────────────────────────

function checkClaudeAvailable(): void {
  try {
    execSync("claude --version", {stdio: "pipe"});
  } catch {
    console.error("");
    console.error("  ERROR: No se encontró el comando `claude`.");
    console.error("  Claude Code debe estar instalado y autenticado.");
    console.error("  Descárgalo en: https://claude.ai/download");
    console.error("");
    process.exit(1);
  }
}

// ─── Step 1: Obtener ruta del vídeo ─────────────────────────────────────────

async function getVideoPath(): Promise<string> {
  let videoArg = process.argv[2];

  if (videoArg) {
    if (!existsSync(videoArg)) {
      console.error(`\n  ERROR: No se encontró el archivo: ${videoArg}\n`);
      process.exit(1);
    }
    return videoArg;
  }

  info("No has pasado ningún vídeo como argumento.");
  info("");

  if (existsSync(TARGET_VIDEO)) {
    const use = await ask(
      "  Ya existe public/assets/video.mp4. ¿Usarlo? [S/n] "
    );
    if (use.trim().toLowerCase() !== "n") {
      return TARGET_VIDEO;
    }
  }

  const inputPath = await ask(
    "  Ruta al vídeo (ej: ~/Videos/grabacion.mp4): "
  );
  const resolved = inputPath.trim().replace(/^~/, process.env.HOME || "~");

  if (!existsSync(resolved)) {
    console.error(`\n  ERROR: No se encontró: ${resolved}\n`);
    process.exit(1);
  }

  return resolved;
}

// ─── Step 2: Copiar vídeo ────────────────────────────────────────────────────

function copyVideo(sourcePath: string): void {
  mkdirSync(PUBLIC_ASSETS, {recursive: true});
  const absSource = path.resolve(sourcePath);

  if (absSource === path.resolve(TARGET_VIDEO)) {
    ok("El vídeo ya está en public/assets/video.mp4");
    return;
  }

  info("Copiando vídeo a public/assets/video.mp4...");
  copyFileSync(absSource, TARGET_VIDEO);
  ok("Vídeo copiado");
}

// ─── Step 3: Pipeline ────────────────────────────────────────────────────────

function runPipeline(): void {
  info("Ejecutando pipeline de edición...");
  info("(La primera vez descarga el modelo Whisper ~1.5 GB)");
  console.log("");

  const steps = [
    {
      n: 1,
      label: "Analizando vídeo",
      cmd: `npx tsx scripts/analyze-video.ts public/assets/video.mp4`,
      out: "public/video-metadata.json",
    },
    {
      n: 2,
      label: "Extrayendo audio",
      cmd: `npx tsx scripts/extract-audio.ts public/assets/video.mp4`,
      out: "public/assets/audio.wav",
    },
    {
      n: 3,
      label: "Transcribiendo con Whisper",
      cmd: `npx tsx scripts/transcribe.ts`,
      out: "public/captions.json",
    },
    {
      n: 4,
      label: "Detectando silencios",
      cmd: `npx tsx scripts/detect-silence.ts public/assets/video.mp4`,
      out: "public/silence.json",
    },
  ];

  for (const s of steps) {
    step(s.n, 4, s.label + "...");
    try {
      execSync(s.cmd, {stdio: "pipe"});
      ok(s.out);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`\n  ERROR en paso ${s.n}: ${msg}\n`);
      process.exit(1);
    }
    console.log("");
  }
}

// ─── Step 4 + 5: Claude Code genera los props ────────────────────────────────

const CLAUDE_PROMPT_TEMPLATE = `Eres el asistente de edición de vídeo de Juanma Salmerón (Atiendo365 / BotGrow.AI).
Convierte esta instrucción en lenguaje natural a un objeto TypeScript de AIReelTemplateProps.

Instrucción del usuario: "INSTRUCCION"

Interfaz de referencia:
interface GraphicItem {
  src: string;           // "assets/nombre.png"
  showAtSecond: number;
  durationSeconds: number;
  x?: number | string;
  y?: number | string;
  width?: number;
  height?: number;
}
interface AIReelTemplateProps {
  videoSrc?: string;
  captionsPath?: string;
  silencePath?: string;
  removeSilence?: boolean;
  showCaptions?: boolean;
  captionPreset?: "classic" | "bold" | "outline" | "glow" | "box";
  showIntro?: boolean;
  ctaText?: string;
  ctaSubtext?: string;
  graphics?: GraphicItem[];
  backgroundMusic?: string;
  musicVolume?: number;
  accentColor?: string;
}

Contexto de marca:
- Handle: @juanma.salmeron
- Marca: Atiendo365 · BotGrow.AI
- Colores: navy #1a2e5a, cyan #00a8e8

Reglas estrictas:
1. Responde ÚNICAMENTE con el bloque de código entre triple backticks.
2. El contenido entre los backticks debe ser solo el cuerpo del objeto (sin tipo, sin export, sin import).
3. Incluye solo los props relevantes para la instrucción del usuario.
4. Si menciona silencios/pausas/cortes → removeSilence: true
5. Si menciona subtítulos/captions/texto → showCaptions: true
6. No inventes gráficos que el usuario no haya mencionado.

Ejemplo de respuesta correcta:
\`\`\`
{
  showCaptions: true,
  captionPreset: "bold",
  removeSilence: true,
  ctaText: "Sígueme para más tips",
  ctaSubtext: "Atiendo365.com"
}
\`\`\``;

function generateConfigWithClaude(userRequest: string): string {
  const prompt = CLAUDE_PROMPT_TEMPLATE.replace("INSTRUCCION", userRequest.replace(/"/g, '\\"'));

  info("Consultando a Claude Code...");
  console.log("");

  let result: string;
  try {
    // claude -p "prompt" — modo no interactivo, imprime la respuesta y sale
    result = execSync(`claude -p ${JSON.stringify(prompt)}`, {
      encoding: "utf-8",
      maxBuffer: 1024 * 1024,
      timeout: 60000,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("\n  ERROR al consultar Claude Code:", msg, "\n");
    process.exit(1);
  }

  return result;
}

// Extrae el objeto literal de la respuesta de Claude
function extractPropsObject(claudeResponse: string): string {
  const match = claudeResponse.match(/```(?:typescript|ts|json)?\s*([\s\S]*?)```/);
  if (match) {
    return match[1].trim();
  }
  // Fallback: si no hay backticks, intentar encontrar un objeto { ... }
  const objMatch = claudeResponse.match(/\{[\s\S]*\}/);
  if (objMatch) {
    return objMatch[0].trim();
  }
  return claudeResponse.trim();
}

// ─── Step 6: Escribir edit-config.ts ─────────────────────────────────────────

function writeEditConfig(propsBody: string): void {
  const body = propsBody.startsWith("{") ? propsBody : `{\n  ${propsBody}\n}`;
  const content = `import type {AIReelTemplateProps} from "./templates/editing/AIReelTemplate";

/**
 * Configuración activa del editor.
 * Generado automáticamente por: npx tsx scripts/editor.ts
 * No edites este archivo manualmente — usa el CLI del editor.
 */
export const EDIT_CONFIG: Partial<AIReelTemplateProps> = ${body};
`;
  writeFileSync(EDIT_CONFIG_PATH, content, "utf-8");
  ok("src/edit-config.ts actualizado");
}

// ─── Step 7: Lanzar Remotion Studio ─────────────────────────────────────────

function launchStudio(): void {
  info("Abriendo Remotion Studio...");
  info("Selecciona la composición 'AIReel' en el panel de la izquierda.");
  info("Ctrl+C para salir cuando termines.");
  console.log("");

  const studio = spawn("npm", ["run", "dev"], {
    stdio: "inherit",
    shell: true,
  });

  studio.on("close", (code) => {
    console.log("");
    info(`Studio cerrado (código ${code}).`);
    info("Para renderizar: npx remotion render AIReel out/reel.mp4");
    console.log("");
  });
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  banner("Atiendo365 · Editor Pro Max");

  // Verificar Claude Code
  checkClaudeAvailable();

  // 1. Obtener vídeo
  const videoPath = await getVideoPath();
  console.log("");

  // 2. Copiar vídeo
  step(1, 4, "Preparando vídeo");
  copyVideo(videoPath);
  console.log("");

  // 3. Pipeline (opcional — saltar si ya existen los archivos)
  const pipelineFiles = [
    "public/video-metadata.json",
    "public/assets/audio.wav",
    "public/captions.json",
    "public/silence.json",
  ];
  const allExist = pipelineFiles.every(existsSync);

  let runPipe = true;
  if (allExist) {
    hr();
    info("Ya existen captions.json y silence.json del vídeo anterior.");
    const rerun = await ask(
      "  ¿Volver a transcribir? (útil si cambiaste el vídeo) [s/N] "
    );
    runPipe = rerun.trim().toLowerCase() === "s";
    console.log("");
  }

  if (runPipe) {
    step(2, 4, "Pipeline de transcripción");
    runPipeline();
  } else {
    step(2, 4, "Pipeline omitido — usando archivos existentes");
    console.log("");
  }

  // 4. Qué quieres hacer
  hr();
  step(3, 4, "Describe tu vídeo en lenguaje natural");
  console.log("");
  info("Ejemplos:");
  info('  "Quiero subtítulos en bold, eliminar los silencios y añadir intro"');
  info('  "Sin intro, captions en estilo glow, CTA: Visita atiendo365.com"');
  info('  "Añade el gráfico assets/stats.png en el segundo 20 durante 5 segundos"');
  console.log("");

  const userRequest = await ask("  ¿Qué quieres hacer con el vídeo? → ");
  console.log("");

  // 5. Claude Code genera props
  const claudeResponse = generateConfigWithClaude(userRequest);
  const propsBody = extractPropsObject(claudeResponse);

  // 6. Escribir config
  step(4, 4, "Actualizando configuración");
  writeEditConfig(propsBody);
  console.log("");

  // Mostrar resumen
  hr();
  info("Configuración aplicada:");
  console.log("");
  propsBody.split("\n").forEach((line) => info(`  ${line}`));
  console.log("");
  hr();
  console.log("");

  // 7. Preguntar si lanzar Studio
  const launch = await ask(
    "  ¿Abrir Remotion Studio ahora para previsualizar? [S/n] "
  );
  rl.close();

  if (launch.trim().toLowerCase() !== "n") {
    console.log("");
    launchStudio();
  } else {
    console.log("");
    info("Para previsualizar más tarde:  npm run dev");
    info("Para renderizar:               npx remotion render AIReel out/reel.mp4");
    console.log("");
  }
}

main().catch((err: Error) => {
  console.error("\n  Error inesperado:", err.message, "\n");
  rl.close();
  process.exit(1);
});
