export const units: Record<string, Record<string, number>> = {
  length: {
    Millimeter: 0.001,
    Centimeter: 0.01,
    Meter: 1,
    Kilometer: 1000,
    Inch: 0.0254,
    Foot: 0.3048,
    Yard: 0.9144,
    Mile: 1609.344,
  },
  area: {
    "Square millimeter": 0.000001,
    "Square centimeter": 0.0001,
    "Square meter": 1,
    "Square kilometer": 1e6,
    "Square inch": 0.00064516,
    "Square foot": 0.09290304,
    Acre: 4046.8564224,
    Hectare: 10000,
  },
  volume: {
    Milliliter: 0.001,
    Liter: 1,
    "Cubic meter": 1000,
    "US gallon": 3.785411784,
    "US quart": 0.946352946,
    "US pint": 0.473176473,
    "US cup": 0.2365882365,
  },
  weight: {
    Milligram: 0.000001,
    Gram: 0.001,
    Kilogram: 1,
    Tonne: 1000,
    Ounce: 0.028349523125,
    Pound: 0.45359237,
    Stone: 6.35029318,
  },
  power: {
    Watt: 1,
    Kilowatt: 1000,
    Megawatt: 1e6,
    "Mechanical horsepower": 745.6998715822702,
  },
  speed: {
    "Meters/second": 1,
    "Kilometers/hour": 1 / 3.6,
    "Miles/hour": 0.44704,
    Knot: 0.5144444444444445,
    "Feet/second": 0.3048,
  },
  temperature: { Celsius: 1, Fahrenheit: 1, Kelvin: 1 },
};
export function convert(value: number, kind: string, from: string, to: string) {
  if (!Number.isFinite(value)) throw new Error("Enter a finite number.");
  if (!units[kind] || !(from in units[kind]) || !(to in units[kind]))
    throw new Error("Choose valid units.");
  if (kind === "temperature") {
    const c =
      from === "Celsius"
        ? value
        : from === "Fahrenheit"
          ? ((value - 32) * 5) / 9
          : value - 273.15;
    if (c < -273.150000001)
      throw new Error("Temperature cannot be below absolute zero.");
    return to === "Celsius"
      ? c
      : to === "Fahrenheit"
        ? (c * 9) / 5 + 32
        : c + 273.15;
  }
  const result = value * (units[kind][from] / units[kind][to]);
  if (!Number.isFinite(result))
    throw new Error("These values exceed the supported numeric range.");
  return result;
}
export function emi(principal: number, annualRate: number, months: number) {
  if (
    !Number.isFinite(principal + annualRate + months) ||
    principal < 0 ||
    annualRate < 0 ||
    months <= 0 ||
    !Number.isInteger(months)
  )
    throw new Error(
      "Use a non-negative loan and rate, and a positive whole number of months.",
    );
  const r = annualRate / 1200;
  return r === 0
    ? principal / months
    : (principal * r) / (1 - Math.pow(1 + r, -months));
}
function anniversary(d: Date, year: number, month = d.getMonth()) {
  const day = Math.min(d.getDate(), new Date(year, month + 1, 0).getDate());
  return new Date(
    year,
    month,
    day,
    d.getHours(),
    d.getMinutes(),
    d.getSeconds(),
  );
}
export function calendarAge(birth: Date, now: Date) {
  if (!Number.isFinite(+birth) || !Number.isFinite(+now) || birth > now)
    throw new Error("Enter a valid birth date that is not in the future.");
  let years = now.getFullYear() - birth.getFullYear();
  if (anniversary(birth, birth.getFullYear() + years) > now) years--;
  let months = 0;
  let cursor = anniversary(birth, birth.getFullYear() + years);
  for (let m = 1; m <= 11; m++) {
    const candidate = anniversary(
      birth,
      birth.getFullYear() + years,
      birth.getMonth() + m,
    );
    if (candidate > now) break;
    months = m;
    cursor = candidate;
  }
  let days = 0;
  const daily = new Date(cursor);
  while (true) {
    const next = new Date(daily);
    next.setDate(next.getDate() + 1);
    if (next > now) break;
    daily.setTime(+next);
    days++;
  }
  const rest = Math.floor((+now - +daily) / 1000);
  let nextBirthday = anniversary(birth, now.getFullYear());
  nextBirthday.setHours(0, 0, 0, 0);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  if (nextBirthday < today)
    nextBirthday = anniversary(birth, now.getFullYear() + 1);
  nextBirthday.setHours(0, 0, 0, 0);
  const civil = (d: Date) =>
    Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  return {
    years,
    months,
    days,
    hours: Math.floor(rest / 3600),
    minutes: Math.floor((rest % 3600) / 60),
    seconds: rest % 60,
    totalSeconds: Math.floor((+now - +birth) / 1000),
    nextBirthday,
    daysUntil: Math.round((civil(nextBirthday) - civil(today)) / 86400000),
  };
}
export function imageGeometry(
  sw: number,
  sh: number,
  w: number,
  h: number,
  fit: string,
) {
  if ([sw, sh, w, h].some((n) => !Number.isFinite(n) || n <= 0))
    throw new Error("Dimensions must be positive.");
  if (fit === "stretch") return { x: 0, y: 0, w, h };
  const r =
    fit === "cover" ? Math.max(w / sw, h / sh) : Math.min(w / sw, h / sh);
  return { x: (w - sw * r) / 2, y: (h - sh * r) / 2, w: sw * r, h: sh * r };
}
export function csvToRecords(text: string) {
  const rows: string[][] = [];
  let row: string[] = [],
    cell = "",
    quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else quoted = !quoted;
    } else if (c === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((c === "\n" || c === "\r") && !quoted) {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  if (quoted) throw new Error("CSV contains an unclosed quoted field.");
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  const headers = rows.shift();
  if (!headers?.length || new Set(headers).size !== headers.length)
    throw new Error("CSV needs unique column headers.");
  return rows
    .filter((r) => r.some(Boolean))
    .map((r) => {
      if (r.length !== headers.length)
        throw new Error("CSV rows have inconsistent column counts.");
      return Object.fromEntries(headers.map((h, i) => [h, r[i]]));
    });
}
export function recordsToCsv(value: unknown) {
  if (
    !Array.isArray(value) ||
    !value.length ||
    value.some((v) => !v || typeof v !== "object" || Array.isArray(v))
  )
    throw new Error("Use a non-empty JSON array of flat objects.");
  const headers = [...new Set(value.flatMap((v) => Object.keys(v)))];
  const escape = (v: unknown) => {
    if (v !== null && typeof v === "object")
      throw new Error("Nested objects are not supported in CSV.");
    const s = String(v ?? "");
    return '"' + s.replaceAll('"', '""') + '"';
  };
  return [
    headers.map(escape).join(","),
    ...value.map((v) => headers.map((h) => escape(v[h])).join(",")),
  ].join("\r\n");
}

/** Parses supported CSS color notation without injecting CSS or HTML. */
export function parseColor(input: string) {
  const value = input.trim().toLowerCase();
  let channels: number[];
  if (/^#[0-9a-f]{3}([0-9a-f]{3})?$/.test(value)) {
    const hex =
      value.length === 4
        ? value
            .slice(1)
            .split("")
            .map((c) => c + c)
            .join("")
        : value.slice(1);
    channels = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
  } else {
    const match = value.match(
      /^(rgb|hsl)\(\s*([+-]?(?:\d*\.)?\d+)\s*,\s*([+-]?(?:\d*\.)?\d+)(%?)\s*,\s*([+-]?(?:\d*\.)?\d+)(%?)\s*\)$/,
    );
    if (!match)
      throw new Error(
        "Use #RGB, #RRGGBB, rgb(255, 0, 0), or hsl(0, 100%, 50%).",
      );
    const a = Number(match[2]),
      b = Number(match[3]),
      c = Number(match[5]);
    if (match[1] === "rgb") {
      if (
        match[4] ||
        match[6] ||
        [a, b, c].some((n) => !Number.isInteger(n) || n < 0 || n > 255)
      )
        throw new Error("RGB channels must be whole numbers from 0 to 255.");
      channels = [a, b, c];
    } else {
      if (
        match[4] !== "%" ||
        match[6] !== "%" ||
        b < 0 ||
        b > 100 ||
        c < 0 ||
        c > 100
      )
        throw new Error(
          "HSL saturation and lightness must be percentages from 0 to 100.",
        );
      const h = ((a % 360) + 360) % 360,
        s = b / 100,
        l = c / 100;
      const chroma = (1 - Math.abs(2 * l - 1)) * s,
        x = chroma * (1 - Math.abs(((h / 60) % 2) - 1)),
        m = l - chroma / 2;
      const base =
        h < 60
          ? [chroma, x, 0]
          : h < 120
            ? [x, chroma, 0]
            : h < 180
              ? [0, chroma, x]
              : h < 240
                ? [0, x, chroma]
                : h < 300
                  ? [x, 0, chroma]
                  : [chroma, 0, x];
      channels = base.map((n) => Math.round((n + m) * 255));
    }
  }
  const [r, g, b] = channels.map((n) => n / 255),
    max = Math.max(r, g, b),
    min = Math.min(r, g, b),
    delta = max - min,
    l = (max + min) / 2;
  const saturation = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
  let hue =
    delta === 0
      ? 0
      : max === r
        ? ((g - b) / delta) % 6
        : max === g
          ? (b - r) / delta + 2
          : (r - g) / delta + 4;
  hue = (hue * 60 + 360) % 360;
  return {
    hex:
      "#" +
      channels
        .map((n) => n.toString(16).padStart(2, "0"))
        .join("")
        .toUpperCase(),
    rgb: `rgb(${channels.join(", ")})`,
    hsl: `hsl(${hue.toFixed(1)}, ${(saturation * 100).toFixed(1)}%, ${(l * 100).toFixed(1)}%)`,
  };
}
