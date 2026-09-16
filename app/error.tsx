"use client";
export default function ErrorPage() {
  return (
    <section className="container section">
      <h1 className="page-title">This workspace could not open.</h1>
      <p>
        Reload the tool to try again. If the problem continues, use another
        browser or report the tool name through our Contact page.
      </p>
      <button className="button" onClick={() => window.location.reload()}>
        Try again
      </button>
    </section>
  );
}
