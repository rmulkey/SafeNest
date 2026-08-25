#!/usr/bin/env python3
"""
Ground truth for "what does a consumer that cannot run JavaScript actually read".

Regex-based measurement of this is untrustworthy and I do not want to act on it.
React's streaming output puts content inside `<div hidden>` blocks with markers
like `<!--$?-->` and `<template id="B:6">`, and hand-rolled nesting logic over
that markup can silently delete the rest of the document and report a dramatic
result that is not real.

So this loads each page in Chromium with JavaScript disabled and reads
`document.body.innerText`, which is the browser's own answer after applying the
`hidden` attribute and CSS. Compared against the same page with JavaScript on.

Usage:
  python3 scripts/verify-nojs-render.py [base-url]
"""

import sys
from playwright.sync_api import sync_playwright

BASE = (sys.argv[1] if len(sys.argv) > 1 else "https://safenesttoys.com").rstrip("/")

PAGES = [
    ("homepage", "/"),
    ("review (older)", "/reviews/green-toys-stacking-cups"),
    ("review index", "/reviews"),
    ("age page", "/best-toys/1-2-years"),
    ("category page", "/categories/sensory-toys"),
    ("buying guide", "/guides/best-sensory-toys-babies"),
    ("gift guide", "/gift-guides/first-birthday-gifts"),
    ("recalls", "/recalls"),
    ("blog article", "/blog/top-7-child-safe-toys-2026"),
    ("methodology", "/transparency"),
]


def measure(ctx, path):
    page = ctx.new_page()
    try:
        page.goto(BASE + path, wait_until="load", timeout=90000)
        page.wait_for_timeout(2500)
        text = page.evaluate("() => document.body.innerText || ''")
        h1 = page.evaluate(
            "() => { const h = document.querySelector('h1'); return h ? h.innerText.trim() : ''; }"
        )
        links = page.evaluate(
            "() => document.querySelectorAll('a[href^=\"/\"]').length"
        )
        mains = page.evaluate("() => document.querySelectorAll('main').length")
        return {
            "words": len(text.split()),
            "h1": h1[:48],
            "links": links,
            "mains": mains,
        }
    finally:
        page.close()


def main() -> int:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        no_js = browser.new_context(java_script_enabled=False)
        with_js = browser.new_context(java_script_enabled=True)

        print(f"no-JS render check of {BASE} (real Chromium, JS disabled)\n")
        print(f"  {'NO-JS':>7} {'WITH-JS':>8} {'LINKS':>6} {'MAIN':>5}  PAGE / h1 seen without JS")
        rows = []
        for label, path in PAGES:
            a = measure(no_js, path)
            b = measure(with_js, path)
            rows.append((label, path, a, b))
            print(
                f"  {a['words']:>7} {b['words']:>8} {a['links']:>6} {a['mains']:>5}  "
                f"{label} — {path}"
            )
            print(f"  {'':>29}  h1 without JS: {a['h1'] or '(none)'!r}")

        tn = sum(r[2]["words"] for r in rows)
        tw = sum(r[3]["words"] for r in rows)
        print(f"\n  totals: {tn} words without JS vs {tw} with JS", end="")
        print(f" — {round(tn / tw * 100) if tw else 0}% reachable")
        blank = [r for r in rows if not r[2]["h1"]]
        print(f"  pages with no <h1> without JS: {len(blank)}/{len(rows)}")

        browser.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
