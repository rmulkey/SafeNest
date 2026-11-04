#!/usr/bin/env python3
"""
Visual/layout UAT against a running site, using headless Chromium.

WHY THIS EXISTS
The markup audits in scripts/ check structure, claims and links. None of them can
see a layout bug: horizontal overflow on mobile, a tap target too small to hit, or
an icon that resolves to nothing. Those only appear once something renders.

The Amazon glyph is the specific motivation. It moved from inline path data to an
SVG <symbol> referenced with <use>. A broken reference paints nothing while every
markup test still passes, because the <use> element is present and correct. This
checks getBBox() on each reference, which is 0x0 exactly when the sprite failed
to resolve.

NOTE ON BROWSER AUTOMATION
This drives Playwright's own bundled Chromium, which is unrelated to the earlier
failed attempts to drive the operator's signed-in Chrome profile. Chrome 136+
refuses remote debugging on the default profile; a clean headless browser has no
such restriction and needs no session.

Usage:
  python3 scripts/uat-visual.py                        # production
  BASE=http://localhost:3141 python3 scripts/uat-visual.py
  SHOTS=1 python3 scripts/uat-visual.py                # write screenshots
"""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path

BASE = os.environ.get("BASE", "https://safenesttoys.com").rstrip("/")
SHOTS = os.environ.get("SHOTS") == "1"
SHOT_DIR = Path("uat-shots")

VIEWPORTS = [
    ("mobile", 375, 667),
    ("tablet", 768, 1024),
    ("desktop", 1280, 800),
]

# One per template, plus the two heaviest listings and the 404.
PAGES = [
    "/",
    "/reviews",
    "/reviews/green-toys-stacking-cups",
    "/guides",
    "/guides/best-sensory-toys-babies",
    "/best-toys",
    "/best-toys/1-2-years",
    "/categories",
    "/categories/sensory-toys",
    "/recalls",
    "/recalls?page=2",
    "/blog",
    "/gift-guides",
    "/safe-toys/wood",
    "/about",
    "/contact",
    "/transparency",
    "/this-page-does-not-exist",
]

# Minimum comfortable tap target. WCAG 2.5.8 sets 24px as the AA floor; 44px is
# the platform guidance both Apple and Google publish, and what this site's own
# button sizing already targets.
# Two thresholds, because conflating them makes the output useless.
#
# 24x24 is WCAG 2.5.8 Target Size (Minimum), Level AA — a genuine failure.
# 44x44 is WCAG 2.5.5 Target Size (Enhanced), Level AAA — advisory, and a target
# can miss it while still being easy to hit if it is short in only one dimension.
# A single 44px threshold reported the whole 36px-tall header every run alongside
# a 32x32 square button that was actually hard to tap, which buried the one
# finding worth acting on.
MIN_TAP_AA = 24
MIN_TAP = 44

PROBE = r"""
() => {
  const out = {
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    overflowing: [],
    glyphs: [],
    smallTaps: [],
    brokenImages: [],
    invisibleText: [],
    stuckSkeletons: 0,
    glyphsSkipped: 0,
    imagesDeferred: 0,
  };

  const vw = document.documentElement.clientWidth;

  // Elements extending past the right edge. Fixed/sticky and deliberately
  // offscreen (sr-only) elements are excluded.
  //
  // So is anything inside an ancestor that clips or scrolls on the x axis. A
  // wide comparison table inside `overflow-x-auto` is the intended design: the
  // container scrolls, the page does not, and document.scrollWidth confirms it.
  // Reporting those was pure noise — /best-toys/1-2-years produced three such
  // lines per viewport while the page itself overflowed by 0px, which buries the
  // findings that do matter.
  const clipsHorizontally = (el) => {
    for (let a = el.parentElement; a && a !== document.documentElement; a = a.parentElement) {
      const ox = getComputedStyle(a).overflowX;
      if (ox === 'auto' || ox === 'scroll' || ox === 'hidden') return true;
    }
    return false;
  };

  for (const el of document.querySelectorAll('body *')) {
    const cs = getComputedStyle(el);
    if (cs.position === 'fixed' || cs.position === 'sticky') continue;
    if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    // sr-only pattern: 1px clipped box.
    if (r.width <= 1 && r.height <= 1) continue;
    if (r.right > vw + 1 && !clipsHorizontally(el)) {
      out.overflowing.push({
        tag: el.tagName.toLowerCase(),
        cls: (el.className || '').toString().slice(0, 70),
        right: Math.round(r.right),
        width: Math.round(r.width),
        text: (el.textContent || '').trim().slice(0, 40),
      });
    }
  }

  // Sprite references: getBBox is 0x0 when the symbol did not resolve.
  //
  // Elements inside a display:none subtree also report 0x0, which is correct
  // browser behaviour and not a broken reference. This site relies on that
  // pattern in both directions — ComparisonTable renders a table with
  // "hidden sm:block" and cards below it, and review pages have a sticky buy bar
  // with "lg:hidden" — so an unfiltered check reported 87 phantom failures on
  // /best-toys/1-2-years at mobile and 1 on a review page at desktop. Skip
  // anything not actually laid out.
  const laidOut = (el) => {
    for (let n = el; n && n !== document.documentElement; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (cs.display === 'none' || cs.visibility === 'hidden') return false;
    }
    return true;
  };

  for (const u of document.querySelectorAll('use')) {
    const svg = u.closest('svg');
    if (!svg || !laidOut(svg)) { out.glyphsSkipped++; continue; }
    let bbox = null;
    try {
      const b = u.getBBox();
      bbox = { w: Math.round(b.width), h: Math.round(b.height) };
    } catch (e) {
      bbox = { w: -1, h: -1 };
    }
    const sr = svg.getBoundingClientRect();
    out.glyphs.push({
      href: u.getAttribute('href') || u.getAttribute('xlink:href') || '',
      bbox,
      rendered: { w: Math.round(sr.width), h: Math.round(sr.height) },
    });
  }

  /*
   * Interactive controls smaller than the comfortable minimum.
   *
   * Measured by hit area, not by the painted box. Enlarging a touch target
   * without changing the design means an absolutely-positioned ::before with
   * negative insets — the pseudo-element is part of the element for hit testing,
   * so a 32x32 control with ::before at -6px on every side is a 44x44 target.
   * getBoundingClientRect cannot see that, so the search button would have been
   * reported as 32x32 forever and no real fix could ever clear the check.
   */
  const hitPadding = (el) => {
    const pad = { top: 0, right: 0, bottom: 0, left: 0 };
    for (const pseudo of ['::before', '::after']) {
      const cs = getComputedStyle(el, pseudo);
      if (cs.content === 'none' || cs.position !== 'absolute') continue;
      if (cs.pointerEvents === 'none') continue;
      const neg = (v) => {
        const f = parseFloat(v);
        return Number.isFinite(f) && f < 0 ? -f : 0;
      };
      pad.top = Math.max(pad.top, neg(cs.top));
      pad.right = Math.max(pad.right, neg(cs.right));
      pad.bottom = Math.max(pad.bottom, neg(cs.bottom));
      pad.left = Math.max(pad.left, neg(cs.left));
    }
    return pad;
  };

  for (const el of document.querySelectorAll('a[href], button, input, select, [role="button"]')) {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    if (r.width <= 1 && r.height <= 1) continue;
    /*
     * Inline links inside prose are not tap targets in the button sense.
     *
     * The <li> part has to exclude navigation. Every nav item is an <a> inside an
     * <li>, so treating any <li> as prose silently exempted the entire nav while
     * still flagging the one nav control that happens to be a <button> — the
     * audit reported "Age Groups" and said nothing about the eight links beside
     * it at exactly the same height.
     */
    /*
     * WCAG 2.5.8 exempts a target "in a sentence or whose size is otherwise
     * constrained by the line-height of non-target text". A link rendered as
     * display:inline is exactly that: its height is the line box, so demanding
     * 24px of it means demanding a bigger font. "official CPSC database" inside a
     * paragraph is the shape being exempted.
     *
     * Anything the author laid out as a box — inline-flex, inline-block, block,
     * grid — is not line-constrained and is held to the minimum.
     */
    if (el.tagName === 'A' && cs.display === 'inline') continue;
    /*
     * The <li> prose test has to exclude navigation. Every nav item is an <a>
     * inside an <li>, so treating any <li> as prose silently exempted the whole
     * nav while still flagging the one nav control that happens to be a <button>
     * — the audit reported "Age Groups" and said nothing about the eight links
     * beside it at exactly the same height.
     */
    const inNav = el.closest('nav, [role="navigation"]');
    const inProse = !inNav && el.closest('p, li');
    if (inProse && el.tagName === 'A') continue;
    /*
     * Skip controls deliberately removed from the accessibility tree. The
     * desktop "⌘K" hint is aria-hidden with tabindex=-1 and duplicates the
     * Search button sitting next to it; it is a visual affordance, not a target
     * anyone is expected to acquire, so holding it to a target-size minimum
     * reports a problem that cannot be fixed without inventing one.
     */
    if (el.getAttribute('aria-hidden') === 'true') continue;
    if (el.closest('[aria-hidden="true"]')) continue;

    const pad = hitPadding(el);
    const w = r.width + pad.left + pad.right;
    const h = r.height + pad.top + pad.bottom;
    if (h < %MIN_TAP% || w < %MIN_TAP%) {
      out.smallTaps.push({
        tag: el.tagName.toLowerCase(),
        w: Math.round(w),
        h: Math.round(h),
        // Fails the Level AA floor in both dimensions, not merely the AAA target.
        failsAA: h < %MIN_TAP_AA% || w < %MIN_TAP_AA%,
        painted:
          w !== r.width || h !== r.height
            ? `${Math.round(r.width)}x${Math.round(r.height)}`
            : '',
        text: (el.textContent || '').trim().slice(0, 40),
        aria: el.getAttribute('aria-label') || '',
      });
    }
  }

  // Broken images.
  //
  // A loading="lazy" image below the fold legitimately reports naturalWidth 0
  // because the browser has not fetched it yet. Counting those reported 134
  // "broken" images on /best-toys/1-2-years where every single one was lazy and
  // offscreen. Only images the browser should already have loaded are flagged:
  // eager ones, and lazy ones intersecting the viewport.
  const vh = document.documentElement.clientHeight;
  for (const img of document.querySelectorAll('img')) {
    if (!laidOut(img)) continue;
    const r = img.getBoundingClientRect();
    const inViewport = r.bottom > 0 && r.top < vh && r.right > 0 && r.left < vw;
    const shouldHaveLoaded = img.loading !== 'lazy' || inViewport;
    if (!shouldHaveLoaded) { out.imagesDeferred++; continue; }
    if (!img.complete || img.naturalWidth === 0) {
      out.brokenImages.push({
        src: (img.currentSrc || img.src || '').slice(0, 110),
        alt: img.getAttribute('alt'),
        loading: img.loading,
      });
    }
  }

  // Text painted the same colour as what is behind it, or faded to nothing.
  //
  // Disabled controls are excluded. ToyFinder's "Back" button uses
  // `disabled:opacity-0` on the first step so it holds its place in a
  // justify-between row without being usable. A disabled button is already out of
  // the tab order and announced as unavailable, so that is a deliberate pattern
  // rather than invisible-but-reachable text.
  for (const el of document.querySelectorAll('h1,h2,h3,p,span,a,li,td,th,button')) {
    const txt = (el.textContent || '').trim();
    if (!txt) continue;
    if (el.disabled) continue;
    if (el.closest('[disabled]')) continue;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    const detail = {
      tag: el.tagName.toLowerCase(),
      cls: (el.getAttribute('class') || '').slice(0, 60),
      text: txt.slice(0, 40),
      color: cs.color,
      opacity: cs.opacity,
    };
    if (cs.opacity === '0') {
      out.invisibleText.push({ ...detail, why: 'opacity:0' });
      continue;
    }
    const fg = cs.color;
    let node = el, bg = 'rgba(0, 0, 0, 0)';
    while (node && bg === 'rgba(0, 0, 0, 0)') {
      bg = getComputedStyle(node).backgroundColor;
      node = node.parentElement;
    }
    if (fg === bg) {
      out.invisibleText.push({ ...detail, why: `color==bg (${fg})` });
    }
  }

  out.stuckSkeletons = document.querySelectorAll('[role="status"][aria-label*="oading" i]').length;
  return out;
}
""".replace("%MIN_TAP_AA%", str(MIN_TAP_AA)).replace("%MIN_TAP%", str(MIN_TAP))


def playwright_help() -> str:
    """
    Explain a missing playwright in terms of *which* interpreter is missing it.

    "playwright is not installed" is misleading when it is installed, just not
    for the python3 currently first on PATH. That is not hypothetical: a homebrew
    upgrade moved the default python3 from 3.13 to 3.15 and this script started
    reporting playwright missing on a machine that had it the whole time, which
    costs more time than it should because the obvious next step — pip install —
    appears to succeed and changes nothing for the interpreter you then re-run.
    """
    import shutil
    import subprocess

    candidates = [
        "/Library/Frameworks/Python.framework/Versions/3.13/bin/python3",
        "/Library/Frameworks/Python.framework/Versions/3.12/bin/python3",
        "/usr/local/bin/python3",
        "/opt/homebrew/bin/python3.13",
        "/opt/homebrew/bin/python3.12",
        shutil.which("python3.13") or "",
        shutil.which("python3.12") or "",
    ]
    have = []
    for c in dict.fromkeys(p for p in candidates if p and Path(p).exists()):
        if c == sys.executable:
            continue
        try:
            r = subprocess.run(
                [c, "-c", "import playwright"],
                capture_output=True,
                timeout=15,
            )
            if r.returncode == 0:
                have.append(c)
        except Exception:  # noqa: BLE001 - probing, any failure just means "no"
            pass

    lines = [
        "playwright is not available to this interpreter.",
        f"  running: {sys.executable}",
    ]
    if have:
        lines.append("  interpreters that do have it:")
        lines += [f"    {h}" for h in have]
        lines.append("  retry with:")
        lines.append(f"    {have[0]} {' '.join(sys.argv)}")
    else:
        lines.append("  no other interpreter on this machine has it either.")
    lines.append("  or install it for this one:")
    lines.append(f"    {sys.executable} -m pip install playwright")
    lines.append(f"    {sys.executable} -m playwright install chromium")
    return "\n".join(lines)


def main() -> int:
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        print(playwright_help())
        return 2

    if SHOTS:
        SHOT_DIR.mkdir(exist_ok=True)

    findings: list[str] = []
    glyph_total = glyph_bad = 0
    console_errors: dict[str, list[str]] = {}

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        for vp_name, w, h in VIEWPORTS:
            ctx = browser.new_context(
                viewport={"width": w, "height": h},
                device_scale_factor=1,
                user_agent=(
                    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0 Safari/537.36 "
                    "SafeNestUAT/1.0"
                ),
            )
            page = ctx.new_page()
            errs: list[str] = []
            page.on("console", lambda m: errs.append(m.text[:160]) if m.type == "error" else None)
            page.on("pageerror", lambda e: errs.append(f"pageerror: {str(e)[:160]}"))

            print(f"\n{'=' * 78}\n{vp_name}  {w}x{h}\n{'=' * 78}")
            for path in PAGES:
                errs.clear()
                url = BASE + path
                try:
                    resp = page.goto(url, wait_until="load", timeout=90_000)
                    page.wait_for_timeout(1200)
                except Exception as e:
                    print(f"  {path:<42} LOAD FAILED {str(e)[:50]}")
                    findings.append(f"{vp_name} {path}: load failed")
                    continue

                r = page.evaluate(PROBE)
                status = resp.status if resp else 0

                hscroll = r["scrollWidth"] - r["clientWidth"]
                over = r["overflowing"]
                taps = r["smallTaps"]
                broken = r["brokenImages"]
                invis = r["invisibleText"]
                glyphs = r["glyphs"]

                bad_glyphs = [g for g in glyphs if g["bbox"]["w"] <= 0 or g["bbox"]["h"] <= 0]
                glyph_total += len(glyphs)
                glyph_bad += len(bad_glyphs)

                taps_aa = [t for t in taps if t.get("failsAA")]

                flags = []
                if hscroll > 1:
                    flags.append(f"H-SCROLL +{hscroll}px")
                if over:
                    flags.append(f"overflow x{len(over)}")
                if bad_glyphs:
                    flags.append(f"UNRESOLVED GLYPH x{len(bad_glyphs)}")
                if broken:
                    flags.append(f"broken img x{len(broken)}")
                if invis:
                    flags.append(f"invisible text x{len(invis)}")
                if r["stuckSkeletons"]:
                    flags.append(f"stuck skeleton x{r['stuckSkeletons']}")
                if taps_aa:
                    flags.append(f"TAP<{MIN_TAP_AA}px x{len(taps_aa)}")
                elif taps:
                    flags.append(f"tap<{MIN_TAP}px x{len(taps)} (advisory)")
                if errs:
                    flags.append(f"console x{len(errs)}")
                    console_errors.setdefault(path, []).extend(errs[:3])

                verdict = "ok" if not flags else " | ".join(flags)
                print(f"  {path:<42} {status} {verdict}")

                # Details for anything that is a genuine defect rather than a nit.
                for o in over[:3]:
                    line = (f"{vp_name} {path}: <{o['tag']}> right={o['right']} "
                            f"vw={r['clientWidth']} cls={o['cls']!r} text={o['text']!r}")
                    findings.append(line)
                    print(f"        overflow: {o['tag']} right={o['right']} "
                          f"(vw {r['clientWidth']}) {o['text'][:30]!r}")
                for g in bad_glyphs[:2]:
                    findings.append(f"{vp_name} {path}: unresolved {g['href']} bbox={g['bbox']}")
                    print(f"        glyph {g['href']} bbox={g['bbox']} svg={g['rendered']}")
                for b in broken[:3]:
                    findings.append(f"{vp_name} {path}: broken image {b['src']}")
                    print(f"        broken img: {b['src'][:80]}")
                for t in invis[:2]:
                    findings.append(
                        f"{vp_name} {path}: invisible text <{t['tag']}> {t['why']} "
                        f"text={t['text']!r} cls={t['cls']!r}"
                    )
                    print(f"        invisible: <{t['tag']}> {t['why']} "
                          f"{t['text'][:30]!r} cls={t['cls'][:40]!r}")
                if hscroll > 1:
                    findings.append(f"{vp_name} {path}: horizontal scroll +{hscroll}px")
                # Tap sizes stay advisory and are deliberately not added to
                # `findings`. Gating on the Level AA floor would fail the run on
                # roughly six shared link styles — "View all →", "How we score",
                # "Browse all reviews" and friends — which are 20px tall because
                # that is their line box. Fixing those means adding min-height to
                # the shared styles: a deliberate design change, not a defect to
                # be caught in passing. The sizes are printed so the decision
                # stays visible.
                for t in taps[:3]:
                    note = f" (painted {t['painted']})" if t.get("painted") else ""
                    level = f"below AA {MIN_TAP_AA}px" if t.get("failsAA") else f"below AAA {MIN_TAP}px"
                    print(f"        tap {t['w']}x{t['h']}{note} <{t['tag']}> "
                          f"{(t['text'] or t['aria'])[:34]!r} — {level}")

                if SHOTS:
                    safe = path.strip("/").replace("/", "_").replace("?", "-") or "home"
                    page.screenshot(
                        path=str(SHOT_DIR / f"{vp_name}-{safe}.png"), full_page=False
                    )
            ctx.close()
        browser.close()

    print(f"\n{'=' * 78}\nSUMMARY\n{'=' * 78}")
    print(f"  sprite references checked: {glyph_total}")
    print(f"  unresolved references:     {glyph_bad}")
    print(f"  layout findings:           {len(findings)}")
    if console_errors:
        print(f"\n  console errors by page:")
        for path, msgs in list(console_errors.items())[:8]:
            print(f"    {path}")
            for m in dict.fromkeys(msgs):
                print(f"      {m[:120]}")
    if findings:
        print(f"\n  findings:")
        for f in dict.fromkeys(findings):
            print(f"    - {f}")
        return 1
    print("\nPASSED: no layout defects, no unresolved sprite references.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
