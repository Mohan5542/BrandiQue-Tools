export type VideoSettings = {
  audioOnly: boolean;
  format: string;
  width: number;
  height: number;
  fit: string;
  quality: number;
  bitrate: number;
  fps: number;
  audio: boolean;
  audioBitrate: number;
};
export function videoArgs(input: string, output: string, s: VideoSettings) {
  if (s.audioOnly)
    return [
      "-i",
      input,
      "-vn",
      "-c:a",
      s.format === "mp3"
        ? "libmp3lame"
        : s.format === "ogg"
          ? "libvorbis"
          : "pcm_s16le",
      ...(s.format === "wav" ? [] : ["-b:a", `${s.audioBitrate}k`]),
      output,
    ];
  if (
    !Number.isInteger(s.width) ||
    !Number.isInteger(s.height) ||
    s.width < 2 ||
    s.height < 2 ||
    s.width > 4096 ||
    s.height > 4096
  )
    throw new Error("Choose whole dimensions between 2 and 4096 pixels.");
  const w = s.width - (s.width % 2),
    h = s.height - (s.height % 2);
  const vf =
    s.fit === "contain"
      ? `scale=${w}:${h}:force_original_aspect_ratio=decrease,pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2,setsar=1`
      : s.fit === "cover"
        ? `scale=${w}:${h}:force_original_aspect_ratio=increase,crop=${w}:${h},setsar=1`
        : `scale=${w}:${h},setsar=1`;
  return [
    "-i",
    input,
    "-vf",
    vf,
    "-threads",
    "1",
    "-c:v",
    s.format === "mp4" ? "libx264" : "libvpx",
    ...(s.format === "mp4"
      ? ["-preset", "ultrafast", "-pix_fmt", "yuv420p"]
      : ["-deadline", "realtime", "-cpu-used", "5", "-pix_fmt", "yuv420p"]),
    ...(s.bitrate > 0
      ? ["-b:v", `${s.bitrate}k`]
      : [
          "-crf",
          String(s.quality),
          ...(s.format === "webm" ? ["-b:v", "0"] : []),
        ]),
    ...(s.fps > 0 ? ["-r", String(s.fps)] : []),
    ...(s.audio
      ? [
          "-c:a",
          s.format === "mp4" ? "aac" : "libopus",
          "-b:a",
          `${s.audioBitrate}k`,
        ]
      : ["-an"]),
    ...(s.format === "mp4" ? ["-movflags", "+faststart"] : []),
    output,
  ];
}
