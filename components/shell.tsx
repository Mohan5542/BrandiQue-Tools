"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  Search,
  Menu,
  X,
  Image,
  Film,
  FileText,
  ArrowLeftRight,
  Calculator,
  Type,
  Code2,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { tools, categories, type Tool } from "@/lib/registry";
const icons = [Image, Film, FileText, ArrowLeftRight, Calculator, Type, Code2];
export function ToolIcon({ tool }: { tool: Tool }) {
  const Icon = icons[categories.indexOf(tool.category)] || Code2;
  return <Icon size={22} />;
}
export function ToolCard({ tool }: { tool: Tool }) {
  const [intent, setIntent] = useState(false);
  const [opening, setOpening] = useState(false);
  return (
    <Link
      prefetch={intent ? null : false}
      onMouseEnter={() => setIntent(true)}
      onFocus={() => setIntent(true)}
      onClick={(event) => {
        if (
          !event.ctrlKey &&
          !event.metaKey &&
          !event.shiftKey &&
          event.button === 0
        )
          setOpening(true);
      }}
      aria-busy={opening}
      className="tool-card"
      href={`/tools/${tool.slug}/`}
    >
      <div className="card-top">
        <span className="tool-icon">
          <ToolIcon tool={tool} />
        </span>
        <ArrowUpRight size={18} />
      </div>
      <h3>{tool.name}</h3>
      <p>{tool.description}</p>
      <div className="card-foot">
        <span>{tool.category}</span>
        <span>
          {opening ? "Opening…" : "Open tool"} <ArrowRight size={13} />
        </span>
      </div>
    </Link>
  );
}
export function Header() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  return (
    <header className="header">
      <div className="header-inner">
        <Link href="/" className="logo" aria-label="BrandiQue Tools home">
          <span className="brand-mark">
            B<span>↗</span>
          </span>
          <span>
            BrandiQue<span className="logo-tools">Tools</span>
          </span>
        </Link>
        <nav aria-label="Main navigation" className={open ? "nav open" : "nav"}>
          <details
            className="tools-dropdown"
            onKeyDown={(e) => {
              if (e.key === "Escape") e.currentTarget.open = false;
            }}
            onBlur={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node))
                e.currentTarget.open = false;
            }}
          >
            <summary>Tools</summary>
            <div className="tools-dropdown-panel">
              <Link
                href="/tools/"
                onClick={(e) => {
                  setOpen(false);
                  e.currentTarget.closest("details")?.removeAttribute("open");
                }}
              >
                Explore all tools →
              </Link>
              {tools
                .filter((t) => t.popular)
                .slice(0, 6)
                .map((t) => (
                  <Link
                    prefetch={false}
                    key={t.slug}
                    href={`/tools/${t.slug}/`}
                    onClick={(e) => {
                      setOpen(false);
                      e.currentTarget
                        .closest("details")
                        ?.removeAttribute("open");
                    }}
                  >
                    {t.name}
                  </Link>
                ))}
            </div>
          </details>
          <Link href="/tools/#categories" onClick={() => setOpen(false)}>
            Categories
          </Link>
          <Link href="/tools/?sort=popular" onClick={() => setOpen(false)}>
            Popular
          </Link>
          <Link href="/tools/?sort=new" onClick={() => setOpen(false)}>
            New tools
          </Link>
          <Link href="/about/" onClick={() => setOpen(false)}>
            About
          </Link>
          <Link href="/privacy/" onClick={() => setOpen(false)}>
            Privacy
          </Link>
        </nav>
        <div className="header-search">
          <Search size={16} />
          <input
            aria-label="Search tools"
            placeholder="Search tools…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          {q && (
            <div className="search-results">
              {tools
                .filter((t) =>
                  (t.name + " " + t.description)
                    .toLowerCase()
                    .includes(q.toLowerCase()),
                )
                .slice(0, 7)
                .map((t) => (
                  <Link
                    prefetch={false}
                    key={t.slug}
                    href={`/tools/${t.slug}/`}
                    onClick={() => setQ("")}
                  >
                    {t.name}
                    <ArrowUpRight size={14} />
                  </Link>
                ))}
              {!tools.some((t) =>
                (t.name + " " + t.description)
                  .toLowerCase()
                  .includes(q.toLowerCase()),
              ) && <p>No matching tools.</p>}
            </div>
          )}
        </div>
        <button
          className="mobile-menu icon-button"
          aria-label={open ? "Close navigation" : "Open navigation"}
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          {open ? <X /> : <Menu />}
        </button>
      </div>
    </header>
  );
}
export function Footer() {
  return (
    <footer>
      <div className="container footer-grid">
        <div>
          <Link href="/" className="logo">
            BrandiQue <span className="accent">Tools</span>
          </Link>
          <p>
            Free browser-based tools by
            <br />
            BrandiQue Web Solutions.
          </p>
          <span className="privacy-badge">
            <ShieldCheck size={15} /> Private by design
          </span>
        </div>
        <div>
          <strong>Explore</strong>
          <Link href="/tools/">All tools</Link>
          <Link href="/tools/?sort=popular">Popular tools</Link>
          <Link href="/about/">About us</Link>
        </div>
        <div>
          <strong>Good to know</strong>
          <Link href="/privacy/">Privacy policy</Link>
          <Link href="/terms/">Terms of service</Link>
          <Link href="/contact/">Contact</Link>
        </div>
        <div>
          <strong>Let’s build something.</strong>
          <p>Websites. Brands. AI automation.</p>
          <a
            href="https://www.brandique.in"
            target="_blank"
            rel="noopener noreferrer"
          >
            BrandiQue Web Solutions ↗
          </a>
        </div>
      </div>
      <div className="container footer-bottom">
        <span>© {new Date().getFullYear()} BrandiQue Tools</span>
        <span>Made for your everyday workflow.</span>
      </div>
    </footer>
  );
}
export function Directory() {
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("All");
  const [sort, setSort] = useState("az");
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sortParam = params.get("sort");
    if (sortParam === "popular" || sortParam === "new") setSort(sortParam);
    const categoryParam = params.get("category");
    if (
      categoryParam &&
      categories.includes(categoryParam as (typeof categories)[number])
    )
      setCategory(categoryParam);
  }, []);
  const list = tools
    .filter(
      (t) =>
        (category === "All" || t.category === category) &&
        (t.name + " " + t.description).toLowerCase().includes(q.toLowerCase()),
    )
    .sort((a, b) =>
      sort === "popular"
        ? Number(!!b.popular) - Number(!!a.popular)
        : sort === "new"
          ? tools.indexOf(b) - tools.indexOf(a)
          : a.name.localeCompare(b.name),
    );
  return (
    <>
      <div className="directory-controls">
        <div className="search-large">
          <Search size={20} />
          <input
            aria-label="Find a tool"
            placeholder="What would you like to do?"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <label className="field">
          <span>Sort tools</span>
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="az">A–Z</option>
            <option value="popular">Popular picks</option>
            <option value="new">Recently added</option>
          </select>
        </label>
      </div>
      <div id="categories" className="chips">
        {["All", ...categories].map((c) => (
          <button
            aria-pressed={category === c}
            className={category === c ? "chip active" : "chip"}
            key={c}
            onClick={() => setCategory(c)}
          >
            {c}
          </button>
        ))}
      </div>
      <p className="muted" role="status">
        {list.length} tools for your workflow
      </p>
      <div className="tool-grid">
        {list.map((t) => (
          <ToolCard key={t.slug} tool={t} />
        ))}
      </div>
      {!list.length && (
        <p>No tools match. Try a different keyword or category.</p>
      )}
    </>
  );
}
