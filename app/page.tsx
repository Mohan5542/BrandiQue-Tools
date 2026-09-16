import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  ShieldCheck,
  Zap,
  LockKeyhole,
  MousePointer2,
  Image,
  Film,
  FileText,
  ArrowLeftRight,
  Calculator,
  Code2,
} from "lucide-react";
import { tools, siteUrl } from "@/lib/registry";
import { ToolCard } from "@/components/shell";
export const metadata = {
  alternates: { canonical: siteUrl },
  openGraph: {
    title: "BrandiQue Tools — Powerful Free Tools. Right in Your Browser.",
    description: "Free local image, video, PDF and everyday tools.",
    url: siteUrl,
  },
};
export default function Home() {
  return (
    <>
      <section className="hero container">
        <div className="hero-eyebrow">
          <span className="small-square" /> YOUR EVERYDAY DIGITAL TOOLKIT
        </div>
        <h1>
          Small tasks.
          <br />
          <span>Powerful tools.</span>
        </h1>
        <p className="hero-description">
          Resize, compress, convert, calculate, edit and create.
          <br className="desktop" /> All in your browser. All on your terms.
        </p>
        <div className="hero-actions">
          <Link href="/tools/" className="button">
            Explore all tools <ArrowRight size={18} />
          </Link>
          <Link href="#popular" className="button secondary">
            Popular tools <ArrowDown />
          </Link>
        </div>
        <div className="hero-proof">
          <span>
            <ShieldCheck size={16} /> No file uploads
          </span>
          <span>
            <LockKeyhole size={15} /> No login
          </span>
          <span>
            <Zap size={15} /> Free to use
          </span>
        </div>
        <div className="hero-caption">
          BRANDIQUE TOOLS{" "}
          <span>
            /{String(tools.length).padStart(2, "0")} tools. One workspace.
          </span>
        </div>
      </section>
      <div className="trust-strip">
        <div className="container">
          <span>Powerful Free Tools. Right in Your Browser.</span>
          <span>
            <ShieldCheck size={17} /> Your files stay on your device.
          </span>
        </div>
      </div>
      <section className="container section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">FIND YOUR FOCUS</p>
            <h2>A tool for every kind of task.</h2>
          </div>
          <Link href="/tools/">
            Browse categories <ArrowUpRight size={17} />
          </Link>
        </div>
        <div className="category-grid">
          {[
            [Image, "Image tools", "Resize. Compress. Refine."],
            [Film, "Video & audio", "Less size. More possibilities."],
            [FileText, "PDF & documents", "Make paperwork work for you."],
            [ArrowLeftRight, "Converters", "The right format, every time."],
            [Calculator, "Calculators", "Every number, made clear."],
            [Code2, "Everyday utilities", "The little things, sorted."],
          ].map(([Icon, title, desc]) => {
            const I = Icon as typeof Image;
            return (
              <Link
                href={`/tools/?category=${encodeURIComponent(String(title) === "Image tools" ? "Images" : String(title) === "Video & audio" ? "Video & Audio" : String(title) === "PDF & documents" ? "PDF & Documents" : String(title) === "Converters" ? "Converters" : String(title) === "Calculators" ? "Calculators" : "Developer & Utilities")}`}
                className="category-card"
                key={String(title)}
              >
                <I size={22} />
                <h3>{String(title)}</h3>
                <p>{String(desc)}</p>
              </Link>
            );
          })}
        </div>
      </section>
      <section id="popular" className="section section-shaded">
        <div className="container">
          <div className="section-heading">
            <div>
              <p className="eyebrow">THE EVERYDAY ESSENTIALS</p>
              <h2>Less effort. More done.</h2>
            </div>
            <Link href="/tools/">
              View all {tools.length} tools <ArrowUpRight size={17} />
            </Link>
          </div>
          <div className="tool-grid">
            {tools
              .filter((t) => t.popular)
              .slice(0, 6)
              .map((t) => (
                <ToolCard key={t.slug} tool={t} />
              ))}
          </div>
        </div>
      </section>
      <section className="container section privacy-section">
        <div>
          <p className="eyebrow">YOUR FILES. YOUR BUSINESS.</p>
          <h2>
            Works on your device.
            <br />
            Stays in your control.
          </h2>
          <p>
            Processing happens locally in your browser. No account to create, no
            conversion server to trust with your files.
          </p>
          <Link className="text-link" href="/privacy/">
            Our approach to privacy <ArrowUpRight size={17} />
          </Link>
        </div>
        <div className="privacy-points">
          {[
            [
              ShieldCheck,
              "Private by design",
              "Your selected files are never sent to a conversion backend.",
            ],
            [
              Zap,
              "Only load what you need",
              "Heavy processing engines load when you use them.",
            ],
            [
              MousePointer2,
              "Open it. Use it. Done.",
              "Dedicated tools, straightforward controls, real downloads.",
            ],
          ].map(([Icon, title, desc]) => {
            const I = Icon as typeof Zap;
            return (
              <div key={String(title)}>
                <I size={24} />
                <div>
                  <h3>{String(title)}</h3>
                  <p>{String(desc)}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>
      <section className="container">
        <div className="brand-cta">
          <div>
            <p className="eyebrow">BUILT BY BRANDIQUE WEB SOLUTIONS</p>
            <h2>Have something bigger in mind?</h2>
            <p>Custom websites, AI automation and business software.</p>
          </div>
          <a
            className="button"
            href="https://www.brandique.in"
            target="_blank"
            rel="noopener noreferrer"
          >
            Let’s build it <ArrowUpRight size={18} />
          </a>
        </div>
      </section>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: "BrandiQue Tools",
            url: siteUrl,
            publisher: {
              "@type": "Organization",
              name: "BrandiQue Web Solutions",
              url: "https://www.brandique.in",
            },
          }),
        }}
      />
    </>
  );
}
function ArrowDown() {
  return <ArrowRight size={17} style={{ transform: "rotate(90deg)" }} />;
}
