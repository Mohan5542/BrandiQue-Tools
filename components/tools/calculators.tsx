"use client";
import { useEffect, useState } from "react";
import { calendarAge, convert, emi, units } from "@/lib/calculations";
import { Field, ErrorAlert } from "@/components/ui";
import { message } from "@/lib/files";
const fmt = (n: number) =>
  new Intl.NumberFormat(undefined, { maximumSignificantDigits: 12 }).format(n);
export function UnitTool({ slug }: { slug: string }) {
  const initial = slug.replace("-converter", "");
  const [kind, setKind] = useState(initial === "unit" ? "length" : initial);
  const keys = Object.keys(units[kind]);
  const [value, setValue] = useState("1");
  const [from, setFrom] = useState(keys[0]);
  const [to, setTo] = useState(keys[1]);
  let result = "",
    error = "";
  try {
    if (value.trim() === "") throw new Error("Enter a value.");
    result = fmt(convert(Number(value), kind, from, to));
  } catch (e) {
    error = message(e);
  }
  return (
    <>
      <div className="fields">
        <Field label="Measurement">
          <select
            value={kind}
            onChange={(e) => {
              const k = e.target.value;
              setKind(k);
              setFrom(Object.keys(units[k])[0]);
              setTo(Object.keys(units[k])[1]);
            }}
          >
            {Object.keys(units).map((k) => (
              <option key={k}>{k}</option>
            ))}
          </select>
        </Field>
        <Field label="Value">
          <input
            type="number"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </Field>
        <Field label="From">
          <select value={from} onChange={(e) => setFrom(e.target.value)}>
            {keys.map((k) => (
              <option key={k}>{k}</option>
            ))}
          </select>
        </Field>
        <Field label="To">
          <select value={to} onChange={(e) => setTo(e.target.value)}>
            {keys.map((k) => (
              <option key={k}>{k}</option>
            ))}
          </select>
        </Field>
      </div>
      <button
        onClick={() => {
          setFrom(to);
          setTo(from);
        }}
      >
        Swap units ↔
      </button>
      <ErrorAlert error={error} />
      {!error && (
        <div className="result-box" aria-live="polite">
          <p>
            {value} {from} equals
          </p>
          <div className="result-number">
            {result} <small>{to}</small>
          </div>
          <p>
            {kind === "temperature"
              ? "C = (F − 32) × 5/9; K = C + 273.15"
              : `Result = input × ${fmt(units[kind][from] / units[kind][to])}`}
          </p>
        </div>
      )}
    </>
  );
}
export function CalculatorTool({ slug }: { slug: string }) {
  const [a, setA] = useState("1000"),
    [b, setB] = useState("10"),
    [c, setC] = useState("12"),
    [mode, setMode] = useState("add"),
    [percentageMode, setPercentageMode] = useState("of");
  let results: [string, number][] = [];
  let error = "";
  try {
    const x = Number(a),
      y = Number(b),
      z = Number(c);
    if (!a.trim() || !b.trim() || !Number.isFinite(x + y) || x < 0 || y < 0)
      throw new Error("Enter valid non-negative values.");
    if (slug === "emi-calculator") {
      const payment = emi(x, y, z);
      results = [
        ["Monthly payment", payment],
        ["Total repayment", payment * z],
        ["Total interest", payment * z - x],
      ];
    } else if (slug === "gst-calculator") {
      const base = mode === "add" ? x : x / (1 + y / 100);
      results = [
        ["Base amount", base],
        ["Tax amount", (base * y) / 100],
        ["Total including tax", base * (1 + y / 100)],
      ];
    } else if (slug === "discount-calculator") {
      if (y > 100) throw new Error("Discount must be between 0 and 100%.");
      results = [
        ["Sale price", x * (1 - y / 100)],
        ["You save", (x * y) / 100],
      ];
    } else if (percentageMode === "change") {
      if (x === 0)
        throw new Error("Percentage change needs a non-zero original value.");
      results = [
        ["Percentage change (%)", ((y - x) / x) * 100],
        ["Difference", y - x],
      ];
    } else if (percentageMode === "ratio") {
      if (y === 0) throw new Error("The total must be greater than zero.");
      results = [["Percentage (%)", (x / y) * 100]];
    } else {
      results = [
        ["Percentage of amount", (x * y) / 100],
        ["Amount increased by percentage", x * (1 + y / 100)],
        ["Amount decreased by percentage", x * (1 - y / 100)],
      ];
    }
    if (results.some(([, n]) => !Number.isFinite(n)))
      throw new Error("These values are too large.");
  } catch (e) {
    error = message(e);
  }
  return (
    <>
      <div className="fields">
        {slug === "percentage-calculator" && (
          <Field label="Calculation mode">
            <select
              value={percentageMode}
              onChange={(e) => setPercentageMode(e.target.value)}
            >
              <option value="of">Percentage of an amount</option>
              <option value="change">Percentage change between values</option>
              <option value="ratio">
                One value as a percentage of another
              </option>
            </select>
          </Field>
        )}
        <Field
          label={
            slug === "emi-calculator"
              ? "Loan amount"
              : slug === "percentage-calculator" && percentageMode === "change"
                ? "Original value"
                : "Amount"
          }
        >
          <input
            type="number"
            min="0"
            value={a}
            onChange={(e) => setA(e.target.value)}
          />
        </Field>
        <Field
          label={
            slug === "emi-calculator"
              ? "Annual interest rate (%)"
              : slug === "percentage-calculator" && percentageMode !== "of"
                ? percentageMode === "change"
                  ? "New value"
                  : "Total value"
                : "Percentage (%)"
          }
        >
          <input
            type="number"
            min="0"
            value={b}
            onChange={(e) => setB(e.target.value)}
          />
        </Field>
        {slug === "emi-calculator" && (
          <Field label="Loan term (months)">
            <input
              type="number"
              min="1"
              step="1"
              value={c}
              onChange={(e) => setC(e.target.value)}
            />
          </Field>
        )}
        {slug === "gst-calculator" && (
          <Field label="Calculation">
            <select value={mode} onChange={(e) => setMode(e.target.value)}>
              <option value="add">Add tax to amount</option>
              <option value="remove">Remove included tax</option>
            </select>
          </Field>
        )}
      </div>
      <ErrorAlert error={error} />
      {!error && (
        <div className="stats-grid" aria-live="polite">
          {results.map(([label, n]) => (
            <div className="stat" key={label}>
              <span>{label}</span>
              <strong>{fmt(n)}</strong>
            </div>
          ))}
        </div>
      )}
      <p className="notice">
        {slug === "emi-calculator"
          ? "Monthly payment = P × r ÷ [1 − (1 + r)⁻ⁿ], where r is the monthly interest rate. Zero-interest loans use P ÷ n. Fees are excluded."
          : slug === "gst-calculator"
            ? "Tax is base × rate ÷ 100. To remove included tax, base = total ÷ (1 + rate ÷ 100)."
            : "Percentage amount = base × percentage ÷ 100."}
      </p>
    </>
  );
}
export function AgeTool() {
  const [dob, setDob] = useState(""),
    [time, setTime] = useState(""),
    [now, setNow] = useState<Date | null>(null);
  const [heart, setHeart] = useState(70),
    [breath, setBreath] = useState(16),
    [sleep, setSleep] = useState(8),
    [steps, setSteps] = useState(5000);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  let age: ReturnType<typeof calendarAge> | null = null,
    error = "";
  let birth: Date | null = null;
  if (dob && now) {
    try {
      birth = new Date(dob + "T" + (time || "00:00") + ":00");
      age = calendarAge(birth, now);
    } catch (e) {
      error = message(e);
    }
  }
  const total = age ? age.totalSeconds / 86400 : 0;
  return (
    <>
      <div className="fields two">
        <Field label="Date of birth">
          <input
            type="date"
            value={dob}
            onChange={(e) => setDob(e.target.value)}
          />
        </Field>
        <Field label="Birth time (optional)">
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
          />
        </Field>
      </div>
      <p className="muted">
        Device timezone:{" "}
        {now ? Intl.DateTimeFormat().resolvedOptions().timeZone : "detecting…"}.
        Without a birth time, midnight is used.
      </p>
      <ErrorAlert error={error} />
      {age && birth && (
        <>
          <div className="result-box">
            <p>Your calendar age</p>
            <div className="result-number">
              {age.years} years, {age.months} months, {age.days} days
            </div>
            <span>
              {age.hours} hours · {age.minutes} minutes · {age.seconds} seconds
            </span>
          </div>
          <div className="stats-grid">
            {[
              ["Total years (365.2425 days)", total / 365.2425],
              ["Completed calendar months", age.years * 12 + age.months],
              ["Total weeks", total / 7],
              ["Total days", total],
              ["Total hours", total * 24],
              ["Total minutes", total * 1440],
              ["Total seconds", age.totalSeconds],
            ].map(([label, n]) => (
              <div className="stat" key={label}>
                <span>{label}</span>
                <strong>{Math.floor(Number(n)).toLocaleString()}</strong>
              </div>
            ))}
          </div>
          <p>
            Born on a {birth.toLocaleDateString(undefined, { weekday: "long" })}
            . Your next birthday is{" "}
            <strong>
              {age.nextBirthday.toLocaleDateString(undefined, {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </strong>{" "}
            — {age.daysUntil} days away.
          </p>
          <h3>Life in numbers</h3>
          <p className="notice">
            Estimate based on adjustable assumptions. These are illustrations,
            not measurements or medical facts about you. A constant daily
            assumption cannot reflect childhood or changes in lifestyle.
          </p>
          <div className="fields">
            {[
              ["Heartbeats / minute", heart, setHeart, 250],
              ["Breaths / minute", breath, setBreath, 100],
              ["Sleep hours / day", sleep, setSleep, 24],
              ["Steps / day", steps, setSteps, 100000],
            ].map(([label, v, set, max]) => (
              <Field key={String(label)} label={String(label)}>
                <input
                  type="number"
                  min="0"
                  max={Number(max)}
                  value={Number(v)}
                  onChange={(e) =>
                    (set as (n: number) => void)(
                      Math.max(
                        0,
                        Math.min(Number(max), Number(e.target.value)),
                      ),
                    )
                  }
                />
              </Field>
            ))}
          </div>
          <div className="stats-grid">
            {[
              ["Estimated heartbeats", total * 1440 * heart],
              ["Estimated breaths", total * 1440 * breath],
              ["Estimated days asleep", (total * sleep) / 24],
              ["Estimated hours awake", total * (24 - sleep)],
              ["Estimated steps", total * steps],
              ["Estimated meals (3/day)", total * 3],
              ["Estimated water (2 L/day)", total * 2],
            ].map(([label, n]) => (
              <div className="stat" key={String(label)}>
                <span>{label}</span>
                <strong>{Math.floor(Number(n)).toLocaleString()}</strong>
              </div>
            ))}
          </div>
        </>
      )}
      {!dob && (
        <div className="result-box">
          <h3>Your story, in numbers.</h3>
          <p>
            Choose your birth date to see your age and the countdown to your
            next birthday.
          </p>
        </div>
      )}
    </>
  );
}
