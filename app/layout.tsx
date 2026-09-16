import type { Metadata } from "next";
import { Header, Footer } from "@/components/shell";
import { siteUrl } from "@/lib/registry";
import "./globals.css";
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "BrandiQue Tools — Powerful Free Browser Tools",
    template: "%s | BrandiQue Tools",
  },
  description:
    "Resize, compress, convert, calculate and create with free tools that process your files locally in your browser.",
  icons: { icon: "/favicon.svg" },
  openGraph: { type: "website", siteName: "BrandiQue Tools" },
  twitter: { card: "summary" },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <Header />
        <main id="main">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
