#!/usr/bin/env node
/**
 * Thin client for the Semrush MCP server, so its data can be pulled on demand
 * instead of exported by hand.
 *
 * Why MCP and not the REST API: the v4 REST endpoints
 * (api.semrush.com/apis/v4/…) answer 403 Forbidden for our key, and the v3
 * Analytics API answers ERROR 120 WRONG KEY - ID PAIR. The same key
 * authenticates at https://mcp.semrush.com/v2/mcp with an
 * `Authorization: Apikey <key>` header. MCP also exposes read-only Projects API
 * v3, which is the only channel that carries Site Audit and Position Tracking —
 * neither has migrated to v4, and the OAuth Projects API is deprecated.
 *
 * The server's own workflow is: discovery tool -> get_report_schema ->
 * execute_report. Discovery tools describe what reports exist; execute_report
 * runs one.
 *
 * Usage:
 *   node scripts/semrush-mcp.mjs tools
 *   node scripts/semrush-mcp.mjs call <tool> '<json args>'
 *   node scripts/semrush-mcp.mjs schema <report>
 *
 * Requires SEMRUSH_API_KEY in the environment:
 *   set -a; . ./.env.local; set +a
 */

const ENDPOINT = "https://mcp.semrush.com/v2/mcp";
const KEY = process.env.SEMRUSH_API_KEY;

if (!KEY) {
  console.error("SEMRUSH_API_KEY is not set. Run: set -a; . ./.env.local; set +a");
  process.exit(1);
}

let nextId = 1;

/** One JSON-RPC round trip. The server is stateless, so no session handshake. */
export async function rpc(method, params = {}) {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Apikey ${KEY}`,
      "Content-Type": "application/json",
      // The server may answer either way; it picks JSON for these calls.
      Accept: "application/json, text/event-stream",
    },
    body: JSON.stringify({ jsonrpc: "2.0", id: nextId++, method, params }),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`${method} -> HTTP ${res.status}: ${text.slice(0, 400)}`);
  }

  // Streamable HTTP transport may frame the reply as SSE.
  const payload = text.startsWith("data:")
    ? text
        .split("\n")
        .filter((l) => l.startsWith("data:"))
        .map((l) => l.slice(5).trim())
        .join("")
    : text;

  const body = JSON.parse(payload);
  if (body.error) {
    throw new Error(`${method} -> ${JSON.stringify(body.error).slice(0, 400)}`);
  }
  return body.result;
}

/**
 * Call a tool and return its text content parsed as JSON where possible.
 * MCP tools answer with a content array; these all use a single text part.
 */
export async function callTool(name, args = {}) {
  const result = await rpc("tools/call", { name, arguments: args });
  const text = (result?.content ?? [])
    .filter((c) => c.type === "text")
    .map((c) => c.text)
    .join("\n");
  if (result?.isError) throw new Error(`${name} reported an error: ${text.slice(0, 600)}`);
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

const [cmd, ...rest] = process.argv.slice(2);

if (!cmd) {
  console.error("usage: semrush-mcp.mjs tools | call <tool> '<json>' | schema <report>");
  process.exit(1);
}

if (cmd === "tools") {
  const { tools } = await rpc("tools/list");
  for (const t of tools) {
    console.log(`${t.name}\n  ${(t.description ?? "").split("\n")[0]}\n`);
  }
} else if (cmd === "call") {
  const [tool, json] = rest;
  const out = await callTool(tool, json ? JSON.parse(json) : {});
  console.log(typeof out === "string" ? out : JSON.stringify(out, null, 2));
} else if (cmd === "schema") {
  const out = await callTool("get_report_schema", { report: rest[0] });
  console.log(typeof out === "string" ? out : JSON.stringify(out, null, 2));
} else {
  console.error(`unknown command: ${cmd}`);
  process.exit(1);
}
