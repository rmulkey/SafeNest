#!/usr/bin/env python3
"""
Drive real Google Chrome, using the user's own signed-in profile, for vendor
dashboards that expose no write API.

Why this exists: Semrush's MCP server carries read-only Projects methods only
(`create_project` answers "unknown report") and its REST write endpoints answer
401/403 for our key. Search Console's sitemap submission needs OAuth. Neither can
be scripted, so the UI has to be driven.

Why it launches Chrome rather than attaching to it: since Chrome 136,
`--remote-debugging-port` is refused when the default user-data-dir is in use, and
a second invocation just prints "Opening in existing browser session" and hands
off. Verified on Chrome 151. Playwright drives Chrome over a pipe instead, which
is not subject to that restriction — but it can only do so for an instance it
starts, so Chrome must be quit first.

No credential is ever read: the signed-in session comes from the profile, and
Chrome decrypts its own cookies through Keychain.

Usage:
  python3 scripts/browser-drive.py check                  # report sign-in state only
  python3 scripts/browser-drive.py inspect-semrush        # dump the project UI
  python3 scripts/browser-drive.py inspect-gsc            # dump the sitemap UI
"""

import subprocess
import sys
import time
import pathlib
from playwright.sync_api import sync_playwright

# The user-data-dir, NOT the profile dir inside it. Passing ".../Chrome/Default"
# would make Chrome create a nested Default/Default and hand us a blank profile
# with none of the signed-in sessions.
CHROME_USER_DATA = (
    pathlib.Path.home() / "Library/Application Support/Google/Chrome"
)

SEMRUSH_PROJECTS = "https://www.semrush.com/projects/"
GSC_SITEMAPS = (
    "https://search.google.com/search-console/sitemaps"
    "?resource_id=sc-domain%3Asafenesttoys.com"
)


def chrome_running() -> int:
    out = subprocess.run(
        ["pgrep", "-f", "/Applications/Google Chrome.app"],
        capture_output=True,
        text=True,
    )
    return len([l for l in out.stdout.split("\n") if l.strip()])


def quit_chrome(timeout: int = 40) -> bool:
    """Graceful quit via AppleScript so Chrome writes its session state and can
    restore tabs. A kill would work but would lose the open tabs."""
    if chrome_running() == 0:
        print("  Chrome is not running")
        return True
    print(f"  asking Chrome to quit ({chrome_running()} processes)…")
    subprocess.run(
        ["osascript", "-e", 'quit app "Google Chrome"'],
        capture_output=True,
        text=True,
    )
    for _ in range(timeout):
        if chrome_running() == 0:
            print("  Chrome has quit")
            return True
        time.sleep(1)
    print(f"  WARNING: {chrome_running()} Chrome processes still alive")
    return False


def signed_out(url: str, title: str, body: str) -> bool:
    """See browser-session.py: Semrush answers a signed-out /projects/ request
    with a 200 on its marketing homepage, so the body has to decide."""
    hay = f"{url} {title}".lower()
    if "accounts.google.com" in hay or "/signin" in hay or "/login" in hay:
        return True
    bounced = url.rstrip("/") in (
        "https://www.semrush.com",
        "https://semrush.com",
    )
    asks = any(m in body.lower() for m in ("log in", "sign in", "start for free"))
    return bounced and asks


# Chrome floods stderr with updater and GCM logging that buries this script's own
# output, so findings are appended here as well as printed.
REPORT = pathlib.Path("/tmp/browser-drive-report.txt")


def say(line: str = "") -> None:
    print(line, flush=True)
    with REPORT.open("a") as fh:
        fh.write(line + "\n")


def report(page, label: str) -> bool:
    url, title = page.url, (page.title() or "").strip()
    body = ""
    try:
        body = page.inner_text("body", timeout=8000)[:800].replace("\n", " ")
    except Exception:
        pass
    ok = not signed_out(url, title, body)
    say()
    say(f"[{label}]")
    say(f"  url        {url[:112]}")
    say(f"  title      {title[:90]}")
    say(f"  signed in  {'YES' if ok else 'NO'}")
    say(f"  page text  {body[:260]}")
    return ok


def dump_controls(page, limit: int = 40) -> None:
    """List the interactive affordances, so the next step can target them without
    guessing at a DOM this script has never seen."""
    js = """
    () => {
      const out = [];
      const sel = 'button, a[role=button], input, select, textarea, [role=textbox]';
      for (const el of document.querySelectorAll(sel)) {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        out.push({
          tag: el.tagName.toLowerCase(),
          type: el.getAttribute('type') || '',
          text: (el.innerText || el.value || '').trim().slice(0, 60),
          aria: el.getAttribute('aria-label') || '',
          ph: el.getAttribute('placeholder') || '',
          id: el.id || '',
          testid: el.getAttribute('data-testid') || el.getAttribute('data-test') || '',
        });
      }
      return out;
    }
    """
    try:
        controls = page.evaluate(js)
    except Exception as exc:
        say(f"  could not enumerate controls: {exc}")
        return
    say(f"\n  interactive controls ({len(controls)}, showing {min(limit, len(controls))}):")
    for c in controls[:limit]:
        bits = [f"<{c['tag']}{'/' + c['type'] if c['type'] else ''}>"]
        for k in ("text", "aria", "ph", "testid", "id"):
            if c[k]:
                bits.append(f"{k}={c[k]!r}")
        say("    " + "  ".join(bits))


def main() -> int:
    cmd = sys.argv[1] if len(sys.argv) > 1 else "check"

    if not CHROME_USER_DATA.exists():
        print(f"FAILED: no Chrome user data dir at {CHROME_USER_DATA}")
        return 1

    REPORT.write_text("")
    say("Reusing your signed-in Chrome profile.")
    if not quit_chrome():
        print("FAILED: Chrome would not quit; cannot take over the profile.")
        return 1

    with sync_playwright() as p:
        ctx = p.chromium.launch_persistent_context(
            user_data_dir=str(CHROME_USER_DATA),
            channel="chrome",
            headless=False,
            viewport=None,
            no_viewport=True,
            args=["--disable-blink-features=AutomationControlled"],
        )
        try:
            page = ctx.pages[0] if ctx.pages else ctx.new_page()

            if cmd in ("check", "inspect-semrush"):
                page.goto(SEMRUSH_PROJECTS, wait_until="domcontentloaded", timeout=90000)
                page.wait_for_timeout(6000)
                ok = report(page, "Semrush → Projects")
                if ok and cmd == "inspect-semrush":
                    dump_controls(page)

            if cmd in ("check", "inspect-gsc"):
                g = page if cmd == "inspect-gsc" else ctx.new_page()
                g.goto(GSC_SITEMAPS, wait_until="domcontentloaded", timeout=90000)
                g.wait_for_timeout(7000)
                ok = report(g, "Search Console → Sitemaps")
                if ok and cmd == "inspect-gsc":
                    dump_controls(g)

            say("\n  DONE — window stays open 5 minutes")
            page.wait_for_timeout(300000)
        finally:
            ctx.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
