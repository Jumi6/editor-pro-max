#!/usr/bin/env npx tsx
/**
 * Sugerencias de contenido sobre IA usando Google Gemini.
 *
 * Requisito: necesitas una API key de Google AI Studio (gratuita)
 *   https://aistudio.google.com/app/apikey
 *
 * Uso:
 *   GOOGLE_API_KEY=tu_clave npx tsx scripts/suggest-content.ts
 *   GOOGLE_API_KEY=tu_clave npx tsx scripts/suggest-content.ts "automatización con IA"
 *   GOOGLE_API_KEY=tu_clave npx tsx scripts/suggest-content.ts "ChatGPT para empresas" --format json
 *
 * O añade la key en un archivo .env:
 *   echo "GOOGLE_API_KEY=tu_clave" >> .env
 */

const topic = process.argv[2] || "inteligencia artificial para pequeñas empresas";
const outputFormat = process.argv[3] === "--format" ? process.argv[4] : "text";

const apiKey = process.env.GOOGLE_API_KEY;
if (!apiKey) {
  console.error("");
  console.error("  ERROR: Falta la API key de Google.");
  console.error("");
  console.error("  1. Obtén tu key gratuita en: https://aistudio.google.com/app/apikey");
  console.error("  2. Ejecútalo así:");
  console.error("       GOOGLE_API_KEY=tu_clave npx tsx scripts/suggest-content.ts");
  console.error("");
  process.exit(1);
}

const SYSTEM_PROMPT = `Eres un estratega de contenido experto en inteligencia artificial para redes sociales.
Tu cliente es Juanma Salmerón (@juanma.salmeron), creador de contenido sobre IA en Instagram, TikTok y YouTube Shorts.
Su marca es Atiendo365 (producto de BotGrow.AI) — automatización de atención al cliente con IA.
Estética: dark tech SaaS, profesional pero cercano, en español.
Genera vídeos de 1 minuto en formato vertical (Reels/TikTok/Shorts).`;

const USER_PROMPT = `Genera 5 ideas de vídeo sobre el tema: "${topic}".

Para cada idea proporciona (en español):
1. GANCHO (primera frase, máximo 10 palabras, que pare el scroll)
2. PUNTOS CLAVE (3 puntos que explicar en el vídeo, muy concretos)
3. CTA FINAL (llamada a la acción al cierre, máximo 8 palabras)
4. HASHTAGS (5-8 hashtags relevantes para el tema)

Formato: estructurado y fácil de copiar directamente al guión.
Adapta el tono a alguien que habla de IA para empresas de manera práctica y accesible.`;

async function main() {
  console.log("");
  console.log("  ╔══════════════════════════════════════╗");
  console.log("  ║   Atiendo365 · Sugerencias de IA     ║");
  console.log("  ╚══════════════════════════════════════╝");
  console.log(`\n  Tema: "${topic}"\n`);
  console.log("  Generando ideas con Gemini...\n");

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

  const body = {
    system_instruction: {
      parts: [{text: SYSTEM_PROMPT}],
    },
    contents: [
      {
        role: "user",
        parts: [{text: USER_PROMPT}],
      },
    ],
    generationConfig: {
      temperature: 0.85,
      maxOutputTokens: 2048,
    },
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("  ERROR de la API de Gemini:", error);
    process.exit(1);
  }

  const data = await response.json() as {
    candidates?: Array<{content?: {parts?: Array<{text?: string}>}}>;
    error?: {message?: string};
  };

  if (data.error) {
    console.error("  ERROR:", data.error.message);
    process.exit(1);
  }

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

  if (outputFormat === "json") {
    // Guardar también en archivo para reutilizar
    const outputPath = "public/content-ideas.txt";
    const {writeFileSync} = await import("fs");
    const {mkdirSync} = await import("fs");
    mkdirSync("public", {recursive: true});
    writeFileSync(outputPath, `Tema: ${topic}\n\n${text}`);
    console.log(text);
    console.log(`\n  ✓ Ideas guardadas en ${outputPath}`);
  } else {
    console.log(text);
  }

  console.log("\n  ════════════════════════════════════════");
  console.log("  Tip: copia el GANCHO directamente como prop 'hook'");
  console.log("  en tu composición AIReel o TikTokVideo.");
  console.log("  ════════════════════════════════════════\n");
}

main().catch((err: Error) => {
  console.error("  Error:", err.message);
  process.exit(1);
});
