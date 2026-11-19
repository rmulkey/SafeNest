#!/usr/bin/env python3
"""
Drive Search Console's "Request indexing" for the ranked URL queue.

WHY THIS EXISTS
Request Indexing is the only lever that moves a specific URL into Google's crawl
queue, and it has no API: the Indexing API accepts only JobPosting and
BroadcastEvent, and the sitemap ping endpoint was retired in 2024. Everything
else has already been done — the sitemap is submitted and Google re-fetched it
within seconds, IndexNow has the full 234 URLs, and check-index-readiness passes
clean. What is left is 135 never-crawled URLs and a UI button.

HOW THIS DIFFERS FROM THE EARLIER FAILED ATTEMPTS
Two things were tried before and both were wrong approaches:
  - attaching to the operator's running Chrome over the remote debugging port,
    which Chrome 136+ refuses for the default profile specifically to stop
    cookie theft;
  - copying the default profile directory, whose session Google rejected.
Neither is attempted here. This launches real Chrome with its own empty profile
directory and the operator signs in themselves, in a visible window. No
credential is read, copied, or stored by this script; the session lives in that
profile directory and nowhere else.

WHERE THE PROFILE LIVES
~/.kiro/gsc-chrome-profile — deliberately outside the repository, so a Google
session cannot be committed by accident. Delete that directory to sign out.

SCOPE AND LIMITS
Request Indexing is rate limited to roughly 10-12 URLs per property per day, so
the queue is capped and ordered by how many uncrawled URLs each page links to
(see rank-indexing-requests.mjs). Google may still decline to index anything
requested; this asks, it does not guarantee.

Usage:
  python3 scripts/gsc-request-indexing.py --login     # sign in once, then exit
  python3 scripts/gsc-request-indexing.py --dry-run   # open each URL, click nothing
  python3 scripts/gsc-request-indexing.py             # request indexing
  python3 scripts/gsc-request-indexing.py --limit 5
"""
from __future__ import annotations

import csv
import io
import os
import sys
import time
from pathlib import Path

try:
    from playwright.sync_api import sync_playwright, TimeoutError as PWTimeout
except ImportError:
    sys.exit(
        "playwright is not available to this interpreter.\n"
        f"  running: {sys.executable}\n"
        "  scripts/uat-visual.py prints the interpreters that do have it."
    )

PROPERTY = os.environ.get("GSC_PROPERTY", "sc-domain:safenesttoys.com")
PROFILE = Path(os.environ.get("GSC_CHROME_PROFILE", Path.home() / ".kiro/gsc-chrome-profile"))
QUEUE = Path("gsc/indexing-request-queue.csv")
SITE = "https://safenesttoys.com"

LOGIN_ONLY = "--login" in sys.argv
DRY_RUN = "--dry-run" in sys.argv
_lim = sys.argv.index("--limit") if "--limit" in sys.argv else -1
LIMIT = int(sys.argv[_lim + 1]) if _lim != -1 else 12
_off = sys.argv.index("--offset") if "--offset" in sys.argv else -1
# Skip the first N of the ranked queue. The daily allowance is small, so
# re-requesting a URL already submitted today wastes it.
OFFSET = int(sys.argv[_off + 1]) if _off != -1 else 0
_gap = sys.argv.index("--gap") if "--gap" in sys.argv else -1
# Seconds between requests. Bursting 12 in a row got one through and then a
# throttle message for every single one after it, so the default is deliberately
# slow.
GAP = int(sys.argv[_gap + 1]) if _gap != -1 else 45

# Button and status text, kept as lists because Search Console's wording shifts
# and is localized.
REQUEST_LABELS = ["Request indexing", "Request Indexing", "REQUEST INDEXING"]
DONE_MARKERS = [
    "Indexing requested",
    "URL was added to a priority crawl queue",
    "added to a priority crawl queue",
]
QUOTA_MARKERS = [
    "Quota exceeded",
    "exceeded your daily quota",
    "Please try again tomorrow",
    "quota for this property",
]
ALREADY_MARKERS = ["Indexing requested earlier", "already requested"]

# Google's soft throttle. Not the daily quota message, and easy to mistake for a
# bug: a burst of requests gets "Oops! Something went wrong / We had a problem
# submitting your indexing request. Please try again later." behind a modal.
THROTTLE_MARKERS = [
    "problem submitting your indexing request",
    "Something went wrong",
]

DISMISS_LABELS = ["Dismiss", "DISMISS", "Got it", "GOT IT", "OK", "Close"]


def dismiss_dialog(page) -> bool:
    """
    Clear any modal so the inspect box is reachable again.

    The modal is why a burst run reported "timed out" for every URL after the
    first: Playwright could not click the inspect box because an overlay was
    intercepting pointer events, and the real cause — a throttle message — was
    sitting unread inside the dialog.
    """
    cleared = False
    for label in DISMISS_LABELS:
        loc = page.get_by_role("button", name=label, exact=False)
        if loc.count():
            try:
                loc.first.click(timeout=4000)
                page.wait_for_timeout(1200)
                cleared = True
            except Exception:  # noqa: BLE001
                pass
    if not cleared and page.locator('[role="dialog"]').count():
        try:
            page.keyboard.press("Escape")
            page.wait_for_timeout(800)
            cleared = True
        except Exception:  # noqa: BLE001
            pass
    return cleared


def load_queue(limit: int) -> list[str]:
    if not QUEUE.exists():
        sys.exit(f"{QUEUE} not found — run: node scripts/rank-indexing-requests.mjs")
    raw = [l for l in QUEUE.read_text().splitlines(keepends=True) if not l.startswith("#")]
    rows = list(csv.DictReader(io.StringIO("".join(raw))))
    urls = []
    for r in rows:
        u = (r.get("url") or "").strip() or SITE + (r.get("path") or "").strip()
        if u.startswith("http"):
            urls.append(u)
    return urls[OFFSET:OFFSET + limit]


INSPECT_BOX_SELECTORS = [
    'input[aria-label*="Inspect"]',
    'input[placeholder*="Inspect"]',
    '[role="combobox"] input',
]


def inspect_via_box(page, url: str) -> bool:
    """
    Inspect a URL through the console's own search box.

    There is no usable deep link. The documented-looking
    /search-console/inspect?resource_id=...&id=<url> form returns Google's own
    404 page for every variant tried — encoded colon, raw colon, with and without
    hl — because the `id` parameter is an internal opaque identifier, not the URL:
    after a real inspection the address bar reads `&id=0l...`. So the only route
    in is the "Inspect any URL" box at the top of the property, which is also
    what a person uses.
    """
    box = None
    for sel in INSPECT_BOX_SELECTORS:
        loc = page.locator(sel)
        if loc.count():
            box = loc.first
            break
    if box is None:
        return False
    box.click()
    box.fill(url)
    page.keyboard.press("Enter")
    return True


def wait_for_inspection(page, timeout_s: int = 70) -> None:
    """Block while Search Console retrieves or tests, then settle."""
    waited = 0
    while waited < timeout_s:
        page.wait_for_timeout(2500)
        waited += 2.5
        body = page.inner_text("body")
        if not any(
            m in body
            for m in ("Retrieving data", "Loading data", "Testing if live URL",
                      "Requesting indexing")
        ):
            return


def page_has(page, needles: list[str]) -> str | None:
    body = page.inner_text("body")
    for n in needles:
        if n.lower() in body.lower():
            return n
    return None


# Cookies Google sets only for an authenticated session.
SESSION_COOKIES = {"SID", "__Secure-1PSID", "SAPISID", "__Secure-3PSID"}


def is_signed_in(ctx) -> bool:
    """
    Authentication state from the cookie jar, not from a page.

    Two earlier approaches both gave confident wrong answers. Reading page text
    reported a healthy session on a browser that had never logged in, because a
    signed-out visit lands on /search-console/about whose feature copy contains
    "Search Console", "Performance", "URL inspection" and "Coverage". Reading
    page.url then missed a completed sign-in, because the poll held a reference
    to the first tab and Google's flow can finish in another one.

    The cookie jar is per-context, so it sees the session whichever tab completed
    it, and it is the same thing the server checks.
    """
    try:
        return bool({c["name"] for c in ctx.cookies()} & SESSION_COOKIES)
    except Exception:
        return False


def current_urls(ctx) -> str:
    try:
        return " | ".join(p.url[:70] for p in ctx.pages) or "(no tabs)"
    except Exception:
        return "(unreadable)"


def goto(page, url: str, tries: int = 3) -> None:
    """
    Navigate, retrying ERR_ABORTED.

    A headed window the operator is also using will abort a navigation that
    races their own click, and Search Console's own client-side routing aborts
    one too. The first run died outright on
    "net::ERR_ABORTED at .../search-console?resource_id=..." immediately after a
    successful sign-in, losing the session it had just established.
    """
    last = None
    for attempt in range(tries):
        try:
            page.goto(url, wait_until="domcontentloaded", timeout=60000)
            return
        except Exception as e:  # noqa: BLE001
            last = e
            if "ERR_ABORTED" not in str(e) and attempt == tries - 1:
                raise
            page.wait_for_timeout(2500)
    if last:
        raise last


def start_sign_in(page) -> None:
    """
    Navigate straight to the login form.

    The marketing page carries two "Start now" links and Playwright could not
    bring either into the viewport — it scrolled, reported "element is outside of
    the viewport", and retried for a minute. Both links point at the same
    ServiceLogin URL, so going there directly skips the fragile click entirely.
    """
    page.goto(
        "https://accounts.google.com/ServiceLogin"
        "?service=sitemaps&continue=https://search.google.com/search-console",
        wait_until="domcontentloaded",
    )
    page.wait_for_timeout(2500)


def main() -> int:
    PROFILE.mkdir(parents=True, exist_ok=True)
    urls = load_queue(LIMIT)
    print(f"property : {PROPERTY}")
    print(f"profile  : {PROFILE}")
    print(f"queue    : {len(urls)} URL(s)   offset {OFFSET}   gap {GAP}s{'  (DRY RUN)' if DRY_RUN else ''}\n")

    with sync_playwright() as pw:
        ctx = pw.chromium.launch_persistent_context(
            user_data_dir=str(PROFILE),
            channel="chrome",          # real Chrome; Chromium-for-Testing gets blocked at login
            headless=False,            # the operator needs to see and use it
            viewport={"width": 1440, "height": 950},
            args=["--disable-blink-features=AutomationControlled"],
        )
        page = ctx.pages[0] if ctx.pages else ctx.new_page()

        print("opening Search Console...")
        goto(page, f"https://search.google.com/search-console?resource_id={PROPERTY}")
        page.wait_for_timeout(3000)

        if not is_signed_in(ctx):
            start_sign_in(page)
            print("\n" + "=" * 68)
            print("  NOT SIGNED IN — a Chrome window is open on Google's login page.")
            print("    1. sign in THERE, in the window this script opened")
            print("       (signing in to your own Chrome does not help — this is a")
            print("        separate browser profile with its own cookie jar)")
            print("    2. leave the window open; this script polls every 5s")
            print("  Credentials are never read or stored by this script. Ctrl-C aborts.")
            print(f"  Session persists in {PROFILE}")
            print("=" * 68 + "\n")
            deadline = time.time() + 900
            waited = 0
            while time.time() < deadline:
                if is_signed_in(ctx):
                    print(f"\nsigned in (session cookie present after {waited}s).")
                    break
                if waited and waited % 30 == 0:
                    print(f"  still waiting ({waited}s) — tabs: {current_urls(ctx)}")
                time.sleep(5)
                waited += 5
            else:
                print(f"\ntimed out after 15 min. Last tabs: {current_urls(ctx)}")
                ctx.close()
                return 2

        # Confirm the session actually reaches the property, not just google.com.
        goto(page, f"https://search.google.com/search-console?resource_id={PROPERTY}")
        page.wait_for_timeout(5000)
        if "/search-console/about" in page.url:
            print("signed in to Google, but this account cannot open the property.")
            print(f"  {PROPERTY} — check it is a verified owner or full user.")
            ctx.close()
            return 2
        print(f"property open: {page.url[:90]}\n")

        if LOGIN_ONLY:
            # Close gracefully so Chrome flushes its cookie store to disk. Killing
            # the process instead loses the session, which is what happened on the
            # first attempt here.
            print("session stored. Re-run without --login to request indexing.")
            ctx.close()
            return 0

        results = {"requested": 0, "already": 0, "throttled": 0, "quota": 0,
                   "failed": 0, "skipped": 0}
        consecutive_throttle = 0
        for i, url in enumerate(urls, 1):
            print(f"[{i}/{len(urls)}] {url}")
            try:
                if not inspect_via_box(page, url):
                    # The box only exists on a property surface; go back and retry.
                    goto(page, f"https://search.google.com/search-console?resource_id={PROPERTY}")
                    page.wait_for_timeout(5000)
                    if not inspect_via_box(page, url):
                        print("      could not find the 'Inspect any URL' box")
                        results["failed"] += 1
                        continue
                wait_for_inspection(page)

                state = page_has(page, ["URL is on Google", "URL is not on Google",
                                        "URL is available to Google"]) or "state unknown"

                hit = page_has(page, QUOTA_MARKERS)
                if hit:
                    print(f"      QUOTA REACHED ({hit}) — stopping; retry tomorrow")
                    results["quota"] += 1
                    break

                btn = None
                for label in REQUEST_LABELS:
                    loc = page.get_by_role("button", name=label, exact=False)
                    if loc.count():
                        btn = loc.first
                        break

                if DRY_RUN:
                    print(f"      dry run — {state}; "
                          f"request control {'found' if btn else 'NOT FOUND'}; nothing clicked")
                    results["skipped"] += 1
                    continue

                if btn is None:
                    print(f"      {state}; no 'Request indexing' control found")
                    results["failed"] += 1
                    continue

                print(f"      {state} — requesting...")
                btn.click()
                # Google tests the live URL first; this takes 10-60s.
                outcome = None
                for _ in range(40):
                    page.wait_for_timeout(2000)
                    if page_has(page, QUOTA_MARKERS):
                        outcome = "quota"
                        break
                    if page_has(page, THROTTLE_MARKERS):
                        outcome = "throttled"
                        break
                    if page_has(page, DONE_MARKERS):
                        outcome = "requested"
                        break
                    if page_has(page, ALREADY_MARKERS):
                        outcome = "already"
                        break

                if outcome == "requested":
                    print("      requested")
                    results["requested"] += 1
                    consecutive_throttle = 0
                elif outcome == "already":
                    print("      already requested earlier")
                    results["already"] += 1
                    consecutive_throttle = 0
                elif outcome == "quota":
                    print("      DAILY QUOTA REACHED — stopping; retry tomorrow")
                    results["quota"] += 1
                    dismiss_dialog(page)
                    break
                elif outcome == "throttled":
                    consecutive_throttle += 1
                    print(f"      throttled by Google ('try again later') "
                          f"[{consecutive_throttle} in a row]")
                    results["throttled"] += 1
                    dismiss_dialog(page)
                    if consecutive_throttle >= 3:
                        print("      three refusals in a row — stopping rather than "
                              "hammering the endpoint. Re-run later.")
                        break
                    # Back off progressively before the next attempt.
                    backoff = 60 * consecutive_throttle
                    print(f"      backing off {backoff}s")
                    page.wait_for_timeout(backoff * 1000)
                    continue
                else:
                    print("      no confirmation seen within 80s")
                    results["failed"] += 1

                # Clear whatever dialog the result left, or the next URL cannot
                # reach the inspect box.
                dismiss_dialog(page)
                # Space requests out rather than bursting; bursting is what
                # triggered the throttle in the first place.
                print(f"      waiting {GAP}s before the next URL")
                page.wait_for_timeout(GAP * 1000)

            except PWTimeout:
                print("      timed out")
                results["failed"] += 1
            except KeyboardInterrupt:
                print("\naborted by operator")
                break
            except Exception as e:  # noqa: BLE001
                print(f"      error: {str(e)[:140]}")
                results["failed"] += 1

        print("\n" + "-" * 50)
        for k, v in results.items():
            print(f"  {k:10} {v}")
        print("\nRe-run scripts/audit-index-coverage.mjs in a few days to see which took.")
        ctx.close()
        return 0


if __name__ == "__main__":
    sys.exit(main())
