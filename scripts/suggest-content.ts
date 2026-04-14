#!/usr/bin/env npx tsx
/**
 * Sugerencias de contenido sobre IA usando Claude (Anthropic).
 *
 * Requisito: necesitas una API key de Anthropic (la misma plataforma que Claude Code)
 *   https://console.anthropic.com/settings/api-keys
 *
 * Uso:
 *   ANTHROPIC_API_KEY=tu_clave npx tsx scripts/suggest-content.ts
 *   ANTHROPIC_API_KEY=tu_clave npx tsx scripts/suggest-content.ts "automatización con IA"
 *   ANTHROPIC_API_KEY=tu_clave npx tsx scripts/suggest-content.ts "ChatGPT para empresas" --save
 *
 * O añade la key en un archivo .env.local (no se sube a Git):
 *   echo "ANTHROPIC_API_KEY=tu_clave" >> .env.local
 *   source .env.local && npx tsx scripts/suggest-content.ts
 */

import Anthropic from "@anthropic-ai/sdk";
import {writeFileSync, mkdirSync} from "fs";
import path from "path";

const topic = process.argv[2] || "inteligencia artificial para pequeñas empresas";
const saveToFile = process.argv.includes("--save");

const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) {
  console.error("");
  console.error("  ERROR: Falta la API key de Anthropic.");
  console.error("");
  console.error("  1. Obtén tu key en: https://console.anthropic.com/settings/api-keys");
  console.error("     (es la misma cuenta que usas con Claude Code)");
  console.error("  2. Ejecútalo así:");
  console.error("       ANTHROPIC_API_KEY=tu_clave npx tsx scripts/suggest-content.ts");
  console.error("");
  process.exit(1);
}

const client = new Anthropic({apiKey});

const SYSTEM_PROMPT = `Eres un estratega de contenido experto en inteligencia artificial para redes sociales.
Tu cliente es Juanma Salmerón (@juanma.salmeron), creador de contenido sobre IA en Instagram, TikTok y YouTube Shorts.
Su marca es Atiendo365 (producto de BotGrow.AI) — automatización de atención al cliente con IA.
Estética del contenido: dark tech SaaS, profesional pero cercano, en español.
Formato objetivo: vídeos de 1 minuto en vertical (Reels/TikTok/Shorts).`;

const USER_PROMPT = `Genera 5 ideas de vídeo sobre el tema: "${topic}".

Para cada idea proporciona (en español):

**IDEA [número]: [título creativo]**
🪝 GANCHO (primera frase, máximo 10 palabras, que pare el scroll):
→ [frase]

📋 PUNTOS CLAVE (3 puntos para desarrollar en el vídeo):
1. [punto concreto y accionable]
2. [punto concreto y accionable]
3. [punto concreto y accionable]

🎯 CTA FINAL (llamada a la acción, máximo 8 palabras):
→ [frase]

🖼️ GRÁFICO RECOMENDADO (prompt para Gemini Imagen, si aplica):
→ [prompt en inglés, estilo dark tech, transparent PNG background, navy #1a2e5a and cyan #00a8e8 palette]

#️⃣ HASHTAGS (6-8 relevantes):
[hashtags]

---`;

async function main() {
  console.log("");
  console.log("  ╔══════════════════════════════════════╗");
  console.log("  ║   Atiendo365 · Ideas con Claude AI   ║");
  console.log("  ╚══════════════════════════════════════╝");
  console.log(`\n  Tema: "${topic}"\n`);
  console.log("  Generando 5 ideas de contenido...\n");
  console.log("  ────────────────────────────────────────\n");

  const stream = client.messages.stream({
    model: "claude-haiku-4-5",  // Rápido y económico para ideas de contenido
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [
      {role: "user", content: USER_PROMPT},
    ],
  });

  let fullText = "";

  // Streaming en tiempo real
  stream.on("text", (delta) => {
    process.stdout.write(delta);
    fullText += delta;
  });

  await stream.finalMessage();

  console.log("\n\n  ════════════════════════════════════════");
  console.log("  Tips de uso:");
  console.log("  • Copia el GANCHO como primera línea de tu guión");
  console.log("  • Pega el prompt del GRÁFICO directamente en Gemini Imagen");
  console.log("  • Guarda el PNG en public/assets/ y añádelo con el prop graphics=[]");
  console.log("  ════════════════════════════════════════\n");

  if (saveToFile) {
    mkdirSync("public", {recursive: true});
    const outputPath = path.join("public", "content-ideas.md");
    writeFileSync(outputPath, `# Ideas de contenido\nTema: ${topic}\n\n${fullText}`);
    console.log(`  ✓ Ideas guardadas en ${outputPath}\n`);
  }
}

main().catch((err: Error) => {
  if (err.message.includes("authentication")) {
    console.error("\n  ERROR: API key inválida o sin permisos.");
    console.error("  Verifica tu key en: https://console.anthropic.com/settings/api-keys\n");
  } else {
    console.error("\n  Error:", err.message, "\n");
  }
  process.exit(1);
});
