"use client";
/* eslint-disable @next/next/no-html-link-for-pages -- Recovery must bypass a failed client router with full document navigation. */
import { Component, useEffect, useState, type ReactNode } from "react";

function Recovery({ slug }: { slug: string }) {
  return (
    <div className="workspace-recovery" role="alert">
      <strong>This tool could not start.</strong>
      <p>
        The tool’s scripts may be blocked, missing, or out of date. Reload the
        page to get a fresh copy. Your files have not been uploaded.
      </p>
      <div className="toolbar">
        <a className="button" href={`/tools/${slug}/?reload=1`}>
          Reload tool
        </a>
        <a href="/tools/">Back to all tools</a>
      </div>
      <p>
        If reloading does not help, share this page’s URL with BrandiQue so the
        published site can be checked.
      </p>
    </div>
  );
}
class WorkspaceBoundary extends Component<
  { slug: string; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <Recovery slug={this.props.slug} />
    ) : (
      this.props.children
    );
  }
}
export function ToolWorkspace({
  slug,
  children,
}: {
  slug: string;
  children: ReactNode;
}) {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  return (
    <div data-tool-ready={ready}>
      <WorkspaceBoundary slug={slug}>
        <fieldset
          className="tool-controls"
          disabled={!ready}
          aria-label="Tool controls"
        >
          {children}
        </fieldset>
      </WorkspaceBoundary>
      {!ready && (
        <div className="workspace-connection-help">
          <p>
            The controls have not connected yet. Reload this page to retry. If
            the issue continues, check that this website’s JavaScript files are
            allowed to load.
          </p>
          <a href={`/tools/${slug}/?reload=1`}>Reload this tool</a>
        </div>
      )}
      <noscript>
        <p className="error">
          JavaScript is disabled. Enable JavaScript to use the tools; your files
          are processed locally on this device.
        </p>
      </noscript>
    </div>
  );
}
