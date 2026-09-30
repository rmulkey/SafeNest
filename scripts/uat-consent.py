#!/usr/bin/env python3
"""
Behavioural UAT for the cookie consent banner and the analytics gating it drives.

WHY THIS EXISTS
CookieConsentBanner was rewritten onto useSyncExternalStore to clear two
react-hooks/set-state-in-effect errors without reintroducing React hydration
error #418. Neither the type checker nor the unit suite can see any of what
actually matters here: whether the server and client first renders agree, whether
AnalyticsProvider notices a choice made in the banner without a page reload, and
whether an aged-out record is pruned. Those only show up in a browser.

The AnalyticsProvider assertion is the one that catches a real prior bug. The
hook used to hold per-component state, so clicking Accept updated the banner's
copy and left the provider believing consent was unanswered — analytics stayed
off until the next navigation.

Run the dev server with a non-empty GA4 id so script injection is observable:
  NEXT_PUBLIC_GA4_MEASUREMENT_ID=G-UATTEST01 npx next dev -p 3141
  BASE=http://localhost:3141 python3 scripts/uat-consent.py
"""
from __future__ import annotations

import json
import os
import sys

from playwright.sync_api import sync_playwright

BASE = os.environ.get("BASE", "http://localhost:3141").rstrip("/")
PAGE = os.environ.get("PAGE", "/reviews/green-toys-stacking-cups")
URL = f"{BASE}{PAGE}"

CONSENT_KEY = "safenest_cookie_consent"
META_KEY = f"{CONSENT_KEY}_meta"

# Substrings that identify a hydration or render failure in React's dev output.
FATAL_CONSOLE = (
    "hydration",
    "did not match",
    "didn't match",
    "minified react error",
    "error #418",
    "#418",
    "#423",
    "#425",
    "getsnapshot should be cached",
    "maximum update depth",
    "missing getserversnapshot",
)

failures: list[str] = []
notes: list[str] = []


def check(ok: bool, label: str, detail: str = "") -> bool:
    if ok:
        print(f"  PASS  {label}")
    else:
        print(f"  FAIL  {label}" + (f"  -> {detail}" if detail else ""))
        failures.append(label + (f" ({detail})" if detail else ""))
    return ok


class Recorder:
    """Collects console errors and page exceptions for one page."""

    def __init__(self, page):
        self.messages: list[str] = []
        page.on("console", self._on_console)
        page.on("pageerror", lambda exc: self.messages.append(f"pageerror: {exc}"))

    def _on_console(self, msg):
        if msg.type in ("error", "warning"):
            self.messages.append(f"{msg.type}: {msg.text}")

    @property
    def fatal(self) -> list[str]:
        return [
            m for m in self.messages
            if any(f in m.lower() for f in FATAL_CONSOLE)
        ]


def banner_visible(page) -> bool:
    return page.locator('div[role="dialog"][aria-label="Cookie consent"]').count() > 0


def banner_height_var(page) -> str:
    return page.evaluate(
        "getComputedStyle(document.documentElement)"
        ".getPropertyValue('--consent-banner-height').trim()"
    )


def storage_state(page) -> dict:
    return page.evaluate(
        """() => ({
             consent: localStorage.getItem('%s'),
             meta: localStorage.getItem('%s'),
           })""" % (CONSENT_KEY, META_KEY)
    )


def ga4_present(page) -> bool:
    return page.evaluate("!!document.getElementById('ga4-script')")


def anon_views(page) -> int:
    return page.evaluate(
        "parseInt(localStorage.getItem('safenest_anon_pageviews') || '0', 10)"
    )


def main() -> int:
    with sync_playwright() as pw:
        browser = pw.chromium.launch()

        # Never actually talk to Google; presence of the tag is the assertion.
        def block_analytics(route):
            route.abort()

        # ---------------------------------------------------------------- A
        print("\nA. First visit, nothing stored")
        ctx = browser.new_context(viewport={"width": 1280, "height": 800})
        ctx.route("**://www.googletagmanager.com/**", block_analytics)
        page = ctx.new_page()
        rec = Recorder(page)
        page.goto(URL, wait_until="networkidle")
        page.wait_for_timeout(600)

        check(not rec.fatal, "no hydration or render error in console",
              "; ".join(rec.fatal[:2]))
        check(banner_visible(page), "banner is shown")
        height = banner_height_var(page)
        px = float(height.replace("px", "")) if height.endswith("px") else 0.0
        check(px > 0, "--consent-banner-height published", f"got {height!r}")
        check(not ga4_present(page), "GA4 not loaded before consent")

        bar = page.locator('[aria-label="Buy this product"]')
        if bar.count():
            offset = page.evaluate(
                """() => {
                     const el = document.querySelector('[aria-label="Buy this product"]');
                     return getComputedStyle(el).bottom;
                   }"""
            )
            off_px = float(offset.replace("px", "")) if offset.endswith("px") else -1
            check(abs(off_px - px) < 1.5,
                  "sticky buy bar clears the banner",
                  f"bar bottom {offset}, banner {height}")
        else:
            notes.append("no sticky buy bar on this page; offset check skipped")

        views_before = anon_views(page)

        # ---------------------------------------------------------------- B
        print("\nB. Click Accept")
        page.click('button[aria-label="Accept analytics cookies"]')
        page.wait_for_timeout(500)

        check(not banner_visible(page), "banner dismissed")
        st = storage_state(page)
        check(st["consent"] == "granted", "storage records granted", repr(st["consent"]))
        ok_meta = False
        if st["meta"]:
            try:
                meta = json.loads(st["meta"])
                days = (meta["expires"] / 1000 - page.evaluate("Date.now()/1000")) / 86400
                ok_meta = 364 <= days <= 366
                notes.append(f"consent expiry is {days:.1f} days out")
            except Exception as exc:  # noqa: BLE001
                notes.append(f"meta parse failed: {exc}")
        check(ok_meta, "expiry meta written ~365 days out", repr(st["meta"]))
        check(ga4_present(page),
              "AnalyticsProvider loaded GA4 on click, with no reload",
              "provider did not observe the banner's choice")
        check(banner_height_var(page).strip() in ("", "0px"),
              "--consent-banner-height cleared once dismissed",
              repr(banner_height_var(page)))
        check(anon_views(page) == views_before,
              "granted visitor not counted as anonymous",
              f"{views_before} -> {anon_views(page)}")
        check(not rec.fatal, "still no hydration or render error",
              "; ".join(rec.fatal[:2]))

        # ---------------------------------------------------------------- C
        print("\nC. Reload with consent stored")
        rec2_page = page
        rec2 = Recorder(rec2_page)
        page.reload(wait_until="networkidle")
        page.wait_for_timeout(600)

        check(not rec2.fatal, "no hydration error when storage disagrees with server",
              "; ".join(rec2.fatal[:2]))
        check(not banner_visible(page), "banner stays hidden")
        check(ga4_present(page), "GA4 loads on a consented page load")
        ctx.close()

        # ---------------------------------------------------------------- D
        print("\nD. Decline path")
        ctx = browser.new_context(viewport={"width": 1280, "height": 800})
        ctx.route("**://www.googletagmanager.com/**", block_analytics)
        page = ctx.new_page()
        rec3 = Recorder(page)
        page.goto(URL, wait_until="networkidle")
        page.wait_for_timeout(500)
        page.click('button[aria-label="Decline analytics cookies"]')
        page.wait_for_timeout(500)

        check(not banner_visible(page), "banner dismissed on decline")
        check(storage_state(page)["consent"] == "declined", "storage records declined")
        check(not ga4_present(page), "GA4 still not loaded after decline")
        check(anon_views(page) >= 1, "declined visitor counted anonymously",
              f"counter={anon_views(page)}")
        check(not rec3.fatal, "no console error on decline path",
              "; ".join(rec3.fatal[:2]))
        ctx.close()

        # ---------------------------------------------------------------- E
        print("\nE. Expired record (366 days old)")
        ctx = browser.new_context(viewport={"width": 1280, "height": 800})
        ctx.route("**://www.googletagmanager.com/**", block_analytics)
        ctx.add_init_script(
            """() => {
                 try {
                   localStorage.setItem('%s', 'granted');
                   localStorage.setItem('%s', JSON.stringify({
                     state: 'granted',
                     expires: Date.now() - 86400000,
                   }));
                 } catch (e) {}
               }"""
            % (CONSENT_KEY, META_KEY)
        )
        page = ctx.new_page()
        rec4 = Recorder(page)
        page.goto(URL, wait_until="networkidle")
        page.wait_for_timeout(700)

        check(banner_visible(page), "banner re-prompts after expiry")
        check(not ga4_present(page), "GA4 not loaded from an expired grant")
        st = storage_state(page)
        check(st["consent"] is None and st["meta"] is None,
              "expired record pruned from storage",
              f"consent={st['consent']!r} meta={st['meta']!r}")
        check(not rec4.fatal, "no console error on expiry path",
              "; ".join(rec4.fatal[:2]))
        ctx.close()

        # ---------------------------------------------------------------- F
        print("\nF. Second tab follows the choice")
        ctx = browser.new_context(viewport={"width": 1280, "height": 800})
        ctx.route("**://www.googletagmanager.com/**", block_analytics)
        tab1 = ctx.new_page()
        tab1.goto(URL, wait_until="networkidle")
        tab2 = ctx.new_page()
        tab2.goto(URL, wait_until="networkidle")
        tab1.wait_for_timeout(400)
        tab2.wait_for_timeout(400)
        check(banner_visible(tab2), "second tab shows the banner")
        tab1.bring_to_front()
        tab1.click('button[aria-label="Accept analytics cookies"]')
        tab1.wait_for_timeout(800)
        check(not banner_visible(tab2), "second tab dismissed the banner too")
        ctx.close()

        browser.close()

    print("\n" + "=" * 62)
    for n in notes:
        print(f"note: {n}")
    if failures:
        print(f"FAILED: {len(failures)} check(s)")
        for f in failures:
            print(f"  - {f}")
        return 1
    print("All consent checks passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
