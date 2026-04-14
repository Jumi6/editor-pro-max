import React from "react";
import {AbsoluteFill, Sequence, staticFile} from "remotion";
import {VideoClip} from "../../components/media/VideoClip";
import {JumpCut} from "../../components/media/JumpCut";
import {CaptionOverlay, type CaptionPreset} from "../../components/text/CaptionOverlay";
import {AnimatedTitle} from "../../components/text/AnimatedTitle";
import {LowerThird} from "../../components/text/LowerThird";
import {CallToAction} from "../../components/overlays/CallToAction";
import {ProgressBar} from "../../components/overlays/ProgressBar";
import {AudioTrack} from "../../components/media/AudioTrack";
import {ImageOverlay} from "../../components/media/ImageOverlay";
import {useSilenceSegments} from "../../hooks/useSilenceSegments";
import {buildCutList, mergeSegments} from "../../utils/editing";
import {Watermark} from "../../components/overlays/Watermark";
import {loadDefaultFonts} from "../../presets/fonts";
import {BRAND} from "../../presets/brand";

/**
 * Un gráfico/imagen que aparece sobre el vídeo en un momento concreto.
 *
 * Ejemplo de uso:
 *   graphics={[
 *     { src: "assets/grafico-ia.png", showAtSecond: 10, durationSeconds: 5 },
 *     { src: "assets/estadistica.png", showAtSecond: 30, durationSeconds: 4, y: 300 },
 *   ]}
 */
export interface GraphicItem {
  src: string;              // Ruta: "assets/mi-grafico.png" (colócalo en public/assets/)
  showAtSecond: number;     // Segundo del vídeo en que aparece
  durationSeconds: number;  // Cuántos segundos se muestra
  x?: number | string;      // Posición horizontal (default: centrado)
  y?: number | string;      // Posición vertical   (default: 300px desde arriba)
  width?: number;           // Ancho en px (default: 900)
  height?: number;          // Alto en px  (default: "auto")
}

export interface AIReelTemplateProps {
  /** Vídeo principal. Coloca el archivo en public/assets/ */
  videoSrc?: string;
  /** Ruta al captions.json generado por scripts/pipeline.sh */
  captionsPath?: string;
  /** Ruta al silence.json generado por scripts/pipeline.sh */
  silencePath?: string;
  /** Eliminar silencios automáticamente */
  removeSilence?: boolean;
  /** Mostrar subtítulos sobre el vídeo */
  showCaptions?: boolean;
  /** Estilo de subtítulos: classic | bold | outline | glow | box */
  captionPreset?: CaptionPreset;
  /** Mostrar intro animada con tu nombre y handle (2 segundos) */
  showIntro?: boolean;
  /** Texto del CTA final. Default: "Sígueme @juanma.salmeron" */
  ctaText?: string;
  /** Subtexto del CTA. Default: tu tagline */
  ctaSubtext?: string;
  /** Gráficos/imágenes a superponer sobre el vídeo */
  graphics?: GraphicItem[];
  /** Música de fondo. Archivo en public/assets/ */
  backgroundMusic?: string;
  /** Volumen de la música (0-1). Default: 0.08 */
  musicVolume?: number;
  /** Color de acento. Default: color primario de tu marca */
  accentColor?: string;
}

export const AIReelTemplate: React.FC<AIReelTemplateProps> = ({
  videoSrc = "assets/video.mp4",
  captionsPath,
  silencePath,
  removeSilence = false,
  showCaptions = true,
  captionPreset = "bold",
  showIntro = true,
  ctaText = `Sígueme ${BRAND.handle}`,
  ctaSubtext = BRAND.tagline,
  graphics = [],
  backgroundMusic,
  musicVolume = 0.08,
  accentColor = BRAND.colors.accent,
}) => {
  loadDefaultFonts();

  const silenceData = useSilenceSegments(silencePath ?? null);

  const segments = silenceData
    ? mergeSegments(
        buildCutList(silenceData.speechSegments, {paddingSeconds: 0.15}),
        0.3,
      )
    : [];

  const src = staticFile(videoSrc);
  const fps = 30;

  // El vídeo empieza después de la intro (2 segundos = 60 frames)
  const introDuration = showIntro ? 60 : 0;

  return (
    <AbsoluteFill style={{backgroundColor: BRAND.colors.bg}}>

      {/* ── INTRO (0 → 60f / 2 segundos) ─────────────────────────────── */}
      {showIntro && (
        <Sequence from={0} durationInFrames={introDuration}>
          <AbsoluteFill
            style={{
              background: `linear-gradient(160deg, ${BRAND.colors.primary} 0%, ${BRAND.colors.bg} 70%)`,
              justifyContent: "center",
              alignItems: "center",
              flexDirection: "column",
              gap: 20,
            }}
          >
            <AnimatedTitle
              text={BRAND.name}
              fontSize={64}
              fontWeight={900}
              color={BRAND.colors.text}
              enterAnimation="scale"
              exitAnimation="fade"
              enterDuration={20}
              holdDuration={25}
              exitDuration={15}
              textShadow={`0 0 60px ${accentColor}80`}
              letterSpacing={-2}
            />
            <AnimatedTitle
              text={BRAND.handle}
              fontSize={30}
              fontWeight={400}
              color={accentColor}
              enterAnimation="slideUp"
              exitAnimation="fade"
              enterDuration={20}
              holdDuration={25}
              exitDuration={15}
            />
          </AbsoluteFill>
        </Sequence>
      )}

      {/* ── VÍDEO PRINCIPAL (desde frame introDuration en adelante) ───── */}
      <Sequence from={introDuration}>
        {removeSilence && segments.length > 0 ? (
          <JumpCut src={src} segments={segments} paddingSeconds={0} />
        ) : (
          <VideoClip src={src} fit="cover" />
        )}
      </Sequence>

      {/* ── SUBTÍTULOS ────────────────────────────────────────────────── */}
      {showCaptions && captionsPath && (
        <Sequence from={introDuration}>
          <CaptionOverlay
            captionsSource={captionsPath}
            preset={captionPreset}
            position="bottom"
            fontSize={62}
            highlightColor={accentColor}
          />
        </Sequence>
      )}

      {/* ── GRÁFICOS / IMÁGENES SUPERPUESTAS ─────────────────────────── */}
      {graphics.map((graphic, i) => {
        const startFrame = introDuration + Math.round(graphic.showAtSecond * fps);
        const durationFrames = Math.round(graphic.durationSeconds * fps);
        return (
          <Sequence key={i} from={startFrame} durationInFrames={durationFrames}>
            <div
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: graphic.y ?? 300,
                display: "flex",
                justifyContent: graphic.x !== undefined ? "flex-start" : "center",
                paddingLeft: graphic.x !== undefined ? graphic.x : 0,
              }}
            >
              <ImageOverlay
                src={staticFile(graphic.src)}
                enterAnimation="scale"
                exitAnimation="fade"
                enterDuration={15}
                exitDuration={10}
                width={graphic.width ?? 900}
                height={graphic.height ?? "auto"}
              />
            </div>
          </Sequence>
        );
      })}

      {/* ── LOWER THIRD — nombre del creador (aparece a los 2s del vídeo) */}
      <Sequence from={introDuration + 15} durationInFrames={150}>
        <LowerThird
          name={BRAND.creator}
          title={`${BRAND.name} · ${BRAND.parentBrand}`}
          accentColor={accentColor}
          position="bottomLeft"
          enterDuration={20}
          holdDuration={100}
          exitDuration={15}
        />
      </Sequence>

      {/* ── CTA FINAL (aparece en el segundo 58, dura 2 segundos) ──────── */}
      <Sequence from={1740} durationInFrames={60}>
        <CallToAction
          text={ctaText}
          subtext={ctaSubtext}
          backgroundColor={`${accentColor}ee`}
          position="bottom"
          enterDelay={0}
        />
      </Sequence>

      {/* ── MÚSICA DE FONDO ───────────────────────────────────────────── */}
      {backgroundMusic && (
        <AudioTrack
          src={staticFile(backgroundMusic)}
          volume={musicVolume}
          fadeInDurationSeconds={1}
          fadeOutDurationSeconds={2}
          loop
        />
      )}

      {/* ── BARRA DE PROGRESO ─────────────────────────────────────────── */}
      <ProgressBar color={accentColor} height={4} position="top" />

      {/* ── WATERMARK ─────────────────────────────────────────────────── */}
      <Watermark
        text={BRAND.watermark.text}
        corner="topRight"
        opacity={BRAND.watermark.opacity}
        fontSize={BRAND.watermark.fontSize}
        color={BRAND.colors.text}
        margin={40}
      />

    </AbsoluteFill>
  );
};
