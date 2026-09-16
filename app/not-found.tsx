import Link from "next/link";
export default function NotFound() {
  return (
    <section className="container section">
      <p className="eyebrow">404 / PAGE NOT FOUND</p>
      <h1 className="page-title">This tool isn’t here.</h1>
      <p>Browse the toolkit to find an available tool.</p>
      <Link className="button" href="/tools/">
        Explore tools →
      </Link>
    </section>
  );
}
