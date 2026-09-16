import Link from "next/link";
import { notFound } from "next/navigation";
import { tools, related, siteUrl } from "@/lib/registry";
import { ToolCard } from "@/components/shell";
import { AdSlot, PrivacyBadge } from "@/components/ui";
import ToolApp from "@/components/tool-app";
export const dynamicParams = false;
export function generateStaticParams() {
  return tools.map((t) => ({ slug: t.slug }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const t = tools.find((t) => t.slug === slug);
  if (!t) return {};
  const title = `Free ${t.name} — Private Browser Tool`;
  return {
    title,
    description: t.description,
    alternates: { canonical: `${siteUrl}/tools/${slug}/` },
    openGraph: {
      title: title + " | BrandiQue Tools",
      description: t.description,
      url: `${siteUrl}/tools/${slug}/`,
    },
    twitter: { card: "summary", title, description: t.description },
  };
}
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const t = tools.find((t) => t.slug === slug);
  if (!t) notFound();
  const faq = [
    {
      q: `What does the ${t.name.toLowerCase()} support?`,
      a: t.formats + ". " + t.limitation,
    },
    {
      q: `How do I use ${t.name.toLowerCase()} without an account?`,
      a: `Open this page and ${t.engine === "age" || t.engine === "calculator" || t.engine === "units" ? "enter your values" : "use the workspace above"}. All normal features are free and require no sign-in.`,
    },
    {
      q: "Are my files or entered details uploaded?",
      a: "No. Tool processing happens in your browser. The website and processing assets are downloaded over the network, but your selected files and entered content are not sent to a conversion backend.",
    },
  ];
  const schema = [
    {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: t.name,
      description: t.description,
      url: `${siteUrl}/tools/${slug}/`,
      applicationCategory: "UtilitiesApplication",
      operatingSystem: "Modern web browser",
      browserRequirements:
        "Requires JavaScript. Local processing capabilities depend on browser support.",
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: siteUrl + "/" },
        {
          "@type": "ListItem",
          position: 2,
          name: "Tools",
          item: siteUrl + "/tools/",
        },
        {
          "@type": "ListItem",
          position: 3,
          name: t.name,
          item: `${siteUrl}/tools/${slug}/`,
        },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faq.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
  ];
  return (
    <div className="container">
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link href="/">Home</Link>
        <span>/</span>
        <Link href="/tools/">Tools</Link>
        <span>/</span>
        <Link href={`/tools/?category=${encodeURIComponent(t.category)}`}>
          {t.category}
        </Link>
        <span>/</span>
        <span aria-current="page">{t.name}</span>
      </nav>
      <div className="tool-heading">
        <p className="eyebrow">
          {t.category.toUpperCase()} / FREE BROWSER TOOL
        </p>
        <h1>{t.name}</h1>
        <p>{t.description}</p>
        <PrivacyBadge />
      </div>
      <div className="app-card">
        <ToolApp engine={t.engine} slug={slug} />
      </div>
      <AdSlot position="after-tool" />
      <div className="tool-content">
        <section>
          <h2>How to use {t.name.toLowerCase()}</h2>
          <ol>
            {t.steps.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
        </section>
        <section>
          <h2>Supported formats & features</h2>
          <p>{t.formats}</p>
          <div className="notice">{t.limitation}</div>
          <h3>Private by design</h3>
          <p>
            Your files stay on your device. Processing happens locally in your
            browser. Closing the tab discards in-memory files. Resume autosave
            can be cleared using Reset.
          </p>
          <Link className="inline-link" href="/privacy/">
            Read our privacy policy →
          </Link>
        </section>
      </div>
      <section className="faq">
        <h2>Frequently asked questions</h2>
        {faq.map((f) => (
          <details key={f.q}>
            <summary>{f.q}</summary>
            <p>{f.a}</p>
          </details>
        ))}
      </section>
      <section className="related">
        <div className="section-heading">
          <h2>Try our other tools</h2>
          <Link href="/tools/">Explore all tools →</Link>
        </div>
        <div className="tool-grid">
          {related(t).map((r) => (
            <ToolCard key={r.slug} tool={r} />
          ))}
        </div>
      </section>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(schema).replace(/</g, "\\u003c"),
        }}
      />
    </div>
  );
}
