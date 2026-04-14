/**
 * ============================================================
 *  BRAND — Identidad de marca. Edita este archivo primero.
 * ============================================================
 *
 *  parentBrand → Nombre de la empresa/marca paraguas
 *  name        → Nombre del producto o marca personal del creador
 *  handle      → Tu @ en Instagram/TikTok
 *  tagline     → Frase corta que describe tu contenido
 *  colors      → Paleta de colores de tu marca
 *    primary   → Navy blue — fondo oscuro y elementos de peso
 *    accent    → Cyan — highlights, captions, barras de progreso
 *    bg        → Fondo dark tech
 *    text      → Color de texto principal
 *    muted     → Texto secundario / subtítulos
 *  watermark   → Marca de agua en los vídeos
 */
export const BRAND = {
  parentBrand: "BotGrow.AI",           // ← Marca paraguas
  name: "Atiendo365",                  // ← Nombre del producto / marca principal
  creator: "Juanma Salmerón",          // ← Tu nombre personal como creador
  handle: "@juanma.salmeron",          // ← Tu @ en Instagram y TikTok
  tagline: "IA que trabaja por ti 24/7", // ← Propuesta de valor
  colors: {
    primary: "#1a2e5a",   // Navy blue
    accent: "#00a8e8",    // Cyan eléctrico — highlights y captions
    bg: "#0d1a2e",        // Dark navy — fondo dark tech SaaS
    surface: "#152240",   // Superficies elevadas (tarjetas, overlays)
    text: "#ffffff",
    muted: "#8ab4d4",     // Azul grisáceo suave
  },
  watermark: {
    text: "@juanma.salmeron",
    opacity: 0.55,
    fontSize: 18,
  },
} as const;
