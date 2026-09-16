import { describe, it, expect } from "vitest";
import {
  calendarAge,
  convert,
  emi,
  imageGeometry,
  csvToRecords,
  recordsToCsv,
} from "../lib/calculations";
import { videoArgs } from "../lib/video";
import { tools, related } from "../lib/registry";
describe("Calendar age", () => {
  it("handles the exact birthday and midnight", () => {
    const a = calendarAge(new Date(2000, 8, 16), new Date(2026, 8, 16));
    expect([a.years, a.months, a.days, a.daysUntil]).toEqual([26, 0, 0, 0]);
  });
  it("clamps leap-day anniversaries to February 28", () => {
    const a = calendarAge(new Date(2000, 1, 29), new Date(2025, 1, 28, 12));
    expect(a.years).toBe(25);
    expect(a.daysUntil).toBe(0);
  });
  it("handles end-of-month and birth time", () => {
    const a = calendarAge(new Date(2024, 0, 31, 15), new Date(2024, 1, 29, 14));
    expect(a.months).toBe(0);
    expect(a.days).toBe(28);
    expect(a.hours).toBe(23);
  });
  it("rejects future and invalid dates", () => {
    expect(() =>
      calendarAge(new Date(2030, 0, 1), new Date(2026, 0, 1)),
    ).toThrow();
    expect(() => calendarAge(new Date("invalid"), new Date())).toThrow();
  });
  it("calculates elapsed seconds exactly", () => {
    expect(
      calendarAge(new Date(2020, 0, 1), new Date(2020, 0, 2, 1, 2, 3))
        .totalSeconds,
    ).toBe(90123);
  });
});
describe("Conversions", () => {
  it.each([
    ["length", "Mile", "Meter", 1609.344],
    ["weight", "Pound", "Kilogram", 0.45359237],
    ["volume", "US gallon", "Liter", 3.785411784],
    ["area", "Acre", "Square meter", 4046.8564224],
    ["power", "Kilowatt", "Watt", 1000],
    ["speed", "Miles/hour", "Meters/second", 0.44704],
  ])("%s uses known factors", (k, f, t, v) =>
    expect(convert(1, k, f, t)).toBeCloseTo(Number(v), 8),
  );
  it("converts temperature with offsets", () => {
    expect(convert(32, "temperature", "Fahrenheit", "Celsius")).toBe(0);
    expect(convert(0, "temperature", "Kelvin", "Celsius")).toBe(-273.15);
    expect(() => convert(-1, "temperature", "Kelvin", "Celsius")).toThrow();
  });
  it("handles zero interest and validates terms", () => {
    expect(emi(12000, 0, 12)).toBe(1000);
    expect(emi(100000, 12, 12)).toBeCloseTo(8884.88, 2);
    expect(() => emi(1, 1, 0)).toThrow();
  });
  it("computes contain and cover without distortion", () => {
    expect(imageGeometry(200, 100, 100, 100, "contain")).toEqual({
      x: 0,
      y: 25,
      w: 100,
      h: 50,
    });
    expect(imageGeometry(200, 100, 100, 100, "cover")).toEqual({
      x: -50,
      y: 0,
      w: 200,
      h: 100,
    });
  });
  it("round trips CSV with quotes, commas, and newlines", () => {
    const records = [{ name: "A, B", note: 'He said "Hi"\nagain' }];
    expect(csvToRecords(recordsToCsv(records))).toEqual(records);
    expect(() => csvToRecords("a,b\n1")).toThrow();
    expect(() => recordsToCsv([{ a: { nested: 1 } }])).toThrow();
  });
});
describe("Video commands and registry", () => {
  it("uses actual codecs and even dimensions", () => {
    const args = videoArgs("input", "output.mp4", {
      audioOnly: false,
      format: "mp4",
      width: 641,
      height: 361,
      fit: "contain",
      quality: 28,
      bitrate: 0,
      fps: 24,
      audio: true,
      audioBitrate: 128,
    });
    expect(args).toContain("libx264");
    expect(args).toContain("aac");
    expect(args.join(" ")).toContain("scale=640:360");
  });
  it("builds a real WAV extraction command", () =>
    expect(
      videoArgs("input", "out.wav", {
        audioOnly: true,
        format: "wav",
        width: 0,
        height: 0,
        fit: "",
        quality: 0,
        bitrate: 0,
        fps: 0,
        audio: true,
        audioBitrate: 128,
      }),
    ).toContain("pcm_s16le"));
  it("has unique routes and descriptions with valid related links", () => {
    expect(new Set(tools.map((t) => t.slug)).size).toBe(tools.length);
    expect(new Set(tools.map((t) => t.description)).size).toBe(tools.length);
    for (const t of tools) {
      expect(t.steps.length).toBe(3);
      expect(
        related(t).every((r) => tools.includes(r) && r.slug !== t.slug),
      ).toBe(true);
    }
  });
});

describe("File metadata compatibility", () => {
  it("fills absent image MIME metadata without changing bytes", async () => {
    const { normalizeFile } = await import("../lib/files");
    const original = new File(
      [new Uint8Array([137, 80, 78, 71])],
      "camera.PNG",
      { type: "application/octet-stream" },
    );
    const file = normalizeFile(original);
    expect(file.type).toBe("image/png");
    expect(new Uint8Array(await file.arrayBuffer())).toEqual(
      new Uint8Array(await original.arrayBuffer()),
    );
  });
  it("does not relabel arbitrary binary files as images", async () => {
    const { normalizeFile } = await import("../lib/files");
    const original = new File(["unknown"], "unknown.exe", {
      type: "application/octet-stream",
    });
    expect(normalizeFile(original)).toBe(original);
  });
});
