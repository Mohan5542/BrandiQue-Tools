"use client";
import { useEffect, useState } from "react";
import { Field, ErrorAlert, Status } from "@/components/ui";
import { download, message } from "@/lib/files";
import { textDocx, textPdf } from "@/lib/documents";
type Resume = {
  name: string;
  contact: string;
  template: string;
  sections: { id: string; title: string; content: string }[];
};
const empty: Resume = {
  name: "",
  contact: "",
  template: "classic",
  sections: [
    "Professional Summary",
    "Skills",
    "Work Experience",
    "Projects",
    "Education",
    "Certifications",
    "Achievements",
    "Languages",
    "Links",
  ].map((title, i) => ({ id: String(i), title, content: "" })),
};
function valid(data: unknown): data is Resume {
  if (!data || typeof data !== "object") return false;
  const d = data as Resume;
  return (
    typeof d.name === "string" &&
    typeof d.contact === "string" &&
    ["classic", "serif", "compact"].includes(d.template) &&
    Array.isArray(d.sections) &&
    d.sections.length <= 30 &&
    d.sections.every(
      (s) =>
        s &&
        typeof s.id === "string" &&
        typeof s.title === "string" &&
        typeof s.content === "string",
    )
  );
}
export default function ResumeTool() {
  const [resume, setResume] = useState<Resume>(empty),
    [ready, setReady] = useState(false),
    [error, setError] = useState(""),
    [status, setStatus] = useState(""),
    [busy, setBusy] = useState(false),
    [keywords, setKeywords] = useState("");
  useEffect(() => {
    try {
      const raw = localStorage.getItem("brandique-resume");
      if (raw) {
        const data = JSON.parse(raw);
        if (valid(data)) setResume(data);
      }
    } catch {
      setError(
        "Saved resume could not be loaded. You can still create and export a new one.",
      );
    }
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    const id = setTimeout(() => {
      try {
        localStorage.setItem("brandique-resume", JSON.stringify(resume));
        setStatus("Saved in this browser.");
      } catch {
        setStatus("Autosave unavailable. Export JSON to keep a copy.");
      }
    }, 700);
    return () => clearTimeout(id);
  }, [resume, ready]);
  function patch(i: number, key: "title" | "content", v: string) {
    setResume((r) => ({
      ...r,
      sections: r.sections.map((s, j) => (j === i ? { ...s, [key]: v } : s)),
    }));
  }
  const text = resume.sections
    .filter((s) => s.content.trim())
    .map((s) => s.title.toUpperCase() + "\n" + s.content)
    .join("\n\n");
  async function exportFile(format: string) {
    setBusy(true);
    setError("");
    try {
      if (!resume.name.trim())
        throw new Error("Add your name before exporting.");
      const blob =
        format === "pdf"
          ? await textPdf(resume.contact + "\n\n" + text, resume.name)
          : await textDocx(resume.contact + "\n\n" + text, resume.name);
      download(blob, "resume." + format);
      setStatus("Resume exported. Review page breaks before submitting.");
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <p className="notice">
        Your resume autosaves only in this browser profile. Use Export JSON for
        a backup. PDF and DOCX exports use a simple single-column layout;
        browser Print preserves the preview template.
      </p>
      <div className="toolbar">
        <button
          className="button"
          disabled={busy}
          onClick={() => exportFile("pdf")}
        >
          Export PDF
        </button>
        <button disabled={busy} onClick={() => exportFile("docx")}>
          Export DOCX
        </button>
        <button onClick={() => window.print()}>Print preview</button>
        <button
          onClick={() =>
            download(
              new Blob([JSON.stringify(resume, null, 2)], {
                type: "application/json",
              }),
              "resume.json",
            )
          }
        >
          Export JSON
        </button>
        <button
          onClick={() => {
            download(
              new Blob([JSON.stringify(resume, null, 2)], {
                type: "application/json",
              }),
              "resume-copy.json",
            );
            setStatus(
              "Duplicate saved as a JSON file. Import it to edit independently.",
            );
          }}
        >
          Duplicate
        </button>
        <button
          onClick={() => {
            if (
              confirm(
                "Clear your resume and its local autosave? Export a backup first.",
              )
            ) {
              setResume(structuredClone(empty));
              localStorage.removeItem("brandique-resume");
            }
          }}
        >
          Reset
        </button>
      </div>
      <div className="editor-layout">
        <div className="editor-controls">
          <Field label="Import resume JSON">
            <input
              type="file"
              accept=".json"
              onChange={async (e) => {
                try {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (file.size > 2 * 1024 * 1024)
                    throw new Error("Resume JSON must be under 2 MB.");
                  const data = JSON.parse(await file.text());
                  if (!valid(data))
                    throw new Error(
                      "This is not a valid BrandiQue resume JSON file.",
                    );
                  setResume(data);
                  setError("");
                } catch (e) {
                  setError(message(e));
                }
              }}
            />
          </Field>
          <Field label="Full name">
            <input
              value={resume.name}
              onChange={(e) =>
                setResume((r) => ({ ...r, name: e.target.value }))
              }
            />
          </Field>
          <Field label="Contact information">
            <textarea
              placeholder="Email • Phone • City • LinkedIn / Portfolio"
              value={resume.contact}
              onChange={(e) =>
                setResume((r) => ({ ...r, contact: e.target.value }))
              }
            />
          </Field>
          <Field label="Preview template">
            <select
              value={resume.template}
              onChange={(e) =>
                setResume((r) => ({ ...r, template: e.target.value }))
              }
            >
              <option value="classic">Classic · Sans serif</option>
              <option value="serif">Editorial · Serif</option>
              <option value="compact">Compact</option>
            </select>
          </Field>
          {resume.sections.map((s, i) => (
            <div key={s.id}>
              <Field label="Section heading">
                <input
                  value={s.title}
                  onChange={(e) => patch(i, "title", e.target.value)}
                />
              </Field>
              <Field label={s.title + " content"}>
                <textarea
                  value={s.content}
                  onChange={(e) => patch(i, "content", e.target.value)}
                  placeholder="Use clear details and measurable achievements."
                />
              </Field>
              <div className="toolbar">
                <button
                  disabled={!i}
                  onClick={() => {
                    const a = [...resume.sections];
                    [a[i - 1], a[i]] = [a[i], a[i - 1]];
                    setResume((r) => ({ ...r, sections: a }));
                  }}
                >
                  Move up
                </button>
                <button
                  onClick={() =>
                    setResume((r) => ({
                      ...r,
                      sections: r.sections.filter((_, j) => i !== j),
                    }))
                  }
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
          <button
            onClick={() =>
              setResume((r) => ({
                ...r,
                sections: [
                  ...r.sections,
                  {
                    id: crypto.randomUUID(),
                    title: "Custom Section",
                    content: "",
                  },
                ],
              }))
            }
          >
            Add section
          </button>
        </div>
        <div>
          <article
            className={"resume-paper " + resume.template}
            aria-label="Resume preview"
          >
            <h2>{resume.name || "Your name"}</h2>
            <p>{resume.contact || "Your contact information"}</p>
            {resume.sections
              .filter((s) => s.content.trim())
              .map((s) => (
                <section key={s.id}>
                  <h3>{s.title}</h3>
                  <p>{s.content}</p>
                </section>
              ))}
          </article>
          <div className="notice">
            <strong>ATS checklist</strong>
            <ul>
              <li>
                {resume.contact.includes("@")
                  ? "✓ Email detected"
                  : "Add an email address"}
              </li>
              <li>✓ Single-column reading order; no tables or image text</li>
              <li>
                {resume.sections.some(
                  (s) => s.title === "Education" && s.content,
                )
                  ? "✓ Education included"
                  : "Education content is missing"}
              </li>
              <li>
                {resume.sections.some((s) => s.title === "Skills" && s.content)
                  ? "✓ Skills included"
                  : "Skills content is missing"}
              </li>
              <li>Use standard headings and verify the exported file.</li>
            </ul>
            <Field label="Job keywords (comma-separated)">
              <input
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
              />
            </Field>
            {keywords && (
              <p>
                {keywords
                  .split(",")
                  .map((k) => k.trim())
                  .filter(Boolean)
                  .map(
                    (k) =>
                      `${k}: ${text.toLowerCase().includes(k.toLowerCase()) ? "found" : "missing"}`,
                  )
                  .join(" · ")}
              </p>
            )}
            <p>No score or template guarantees ATS acceptance.</p>
          </div>
        </div>
      </div>
      <ErrorAlert error={error} />
      <Status text={status} />
    </>
  );
}
