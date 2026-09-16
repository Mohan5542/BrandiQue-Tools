import { Directory } from "@/components/shell";
import { siteUrl, tools } from "@/lib/registry";
export const metadata = {
  title: "All Free Browser Tools",
  description: `Explore ${tools.length} local browser tools for images, videos, documents, calculations and everyday work.`,
  alternates: { canonical: siteUrl + "/tools/" },
};
export default function Page() {
  return (
    <section className="container section">
      <p className="eyebrow">YOUR TOOLKIT, ORGANIZED</p>
      <h1 className="page-title">What can we help you do?</h1>
      <p className="lead">
        Find your next shortcut. Every tool is free, with no account required.
      </p>
      <Directory />
    </section>
  );
}
