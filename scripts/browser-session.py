#!/usr/bin/env python3
"""
Open a real browser window with a persistent profile, for vendor dashboards that
have no write API.

Semrush's MCP server exposes read-only Projects methods only (`get_project`,
`list_projects`; `create_project` answers "unknown report"), and the REST write
endpoints answer 401/403 for our key. Search Console's sitemap submission needs
OAuth against a Google account. Neither task can be done from a script, so this
drives the UI instead.

Credentials stay with the user: the profile directory persists cookies between
runs, so signing in happens once, by hand, in the window this opens. Nothing here
reads, stores or transmits a password.

Usage:
  python3 scripts/browser-session.py status    # report sign-in state on both
  python3 scripts/browser-session.py open      # open both tabs and wait
"""

import sys
import pathlib
from playwright.sync_api import sync_playwright

PROFILE = pathlib.Path(__file__).resolve().parent.parent / ".playwright-profile"
SEMRUSH_PROJECTS = "https://www.semrush.com/projects/"
GSC_SITEMAPS = "https://search.google.com/search-console/sitemaps?resource_id=sc-domain%3Asafenesttoys.com"

def signed_out(url: str, title: str, body: str) -> bool:
    """
    Whether the page is really asking us to authenticate.

    Checking only the URL and title got this wrong: Semrush answers a signed-out
    request for /projects/ with a 200 on its marketing homepage, whose title is a
    product tagline and whose URL is just "/". Nothing in either string says
    "login". The body did — "Log In", "Start for free" — so the body is what
    decides, and a redirect away from the requested path is treated as a signal in
    its own right.
    """
    haystack = f"{url} {title}".lower()
    if "accounts.google.com" in haystack or "/signin" in haystack or "/login" in haystack:
        return True
    # Bounced off the app and onto a marketing or sign-in surface.
    landed_on_marketing = url.rstrip("/") in (
        "https://www.semrush.com",
        "https://semrush.com",
    )
    asks_to_log_in = any(
        m in body.lower() for m in ("log in", "sign in", "start for free")
    )
    return landed_on_marketing and asks_to_log_in


def describe(page, label: str) -> bool:
    url = page.url
    title = (page.title() or "").strip()
    body = ""
    try:
        body = page.inner_text("body", timeout=5000)[:600].replace("\n", " ")
    except Exception:
        pass
    out = signed_out(url, title, body)
    print(f"\n[{label}]")
    print(f"  url        {url[:110]}")
    print(f"  title      {title[:90]}")
    print(f"  signed in  {'NO - needs sign-in' if out else 'YES'}")
    if body:
        print(f"  page text  {body[:180]}")
    return not out


def main() -> int:
    cmd = sys.argv[1] if len(sys.argv) > 1 else "status"
    PROFILE.mkdir(exist_ok=True)

    with sync_playwright() as p:
        ctx = p.chromium.launch_persistent_context(
            user_data_dir=str(PROFILE),
            headless=False,
            viewport={"width": 1440, "height": 900},
            args=["--disable-blink-features=AutomationControlled"],
        )

        semrush = ctx.pages[0] if ctx.pages else ctx.new_page()
        semrush.goto(SEMRUSH_PROJECTS, wait_until="domcontentloaded", timeout=90000)
        semrush.wait_for_timeout(4000)
        describe(semrush, "Semrush → Projects")

        gsc = ctx.new_page()
        gsc.goto(GSC_SITEMAPS, wait_until="domcontentloaded", timeout=90000)
        gsc.wait_for_timeout(4000)
        describe(gsc, "Search Console → Sitemaps")

        if cmd == "open":
            # Held open so the user can sign in by hand. The profile persists, so
            # a later run reuses the session — but only one process may hold the
            # profile lock, so this one has to be stopped before the next starts.
            print(
                "\nWindow is open and will stay open for 30 minutes.\n"
                "Sign in to whichever tabs you want automated, then say so and I\n"
                "will stop this process and drive the rest from the saved session."
            )
            semrush.wait_for_timeout(1_800_000)

        ctx.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
