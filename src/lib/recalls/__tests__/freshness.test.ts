import { describe, it, expect } from "vitest";
import {
  getFreshnessStatus,
  FRESH_LIMIT_HOURS,
  AGING_LIMIT_HOURS,
} from "../freshness";

const NOW = new Date("2026-07-28T12:00:00Z");
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 3_600_000);

describe("getFreshnessStatus", () => {
  it("reports fresh within the daily-job grace period", () => {
    const s = getFreshnessStatus(hoursAgo(6), NOW);
    expect(s.level).toBe("fresh");
    expect(s.monitoringClaimSupported).toBe(true);
    expect(s.detail).toMatch(/last successful synchronisation/i);
  });

  it("reports aging past the fresh limit and withdraws the monitoring claim", () => {
    const s = getFreshnessStatus(hoursAgo(FRESH_LIMIT_HOURS + 1), NOW);
    expect(s.level).toBe("aging");
    expect(s.monitoringClaimSupported).toBe(false);
    expect(s.detail).toMatch(/official CPSC/i);
  });

  it("reports stale past the aging limit and tells users not to rely on the page", () => {
    const s = getFreshnessStatus(hoursAgo(AGING_LIMIT_HOURS + 24), NOW);
    expect(s.level).toBe("stale");
    expect(s.monitoringClaimSupported).toBe(false);
    expect(s.detail).toMatch(/do not rely on this page/i);
  });

  it("never claims monitoring is supported when data has never synced", () => {
    const s = getFreshnessStatus(null, NOW);
    expect(s.level).toBe("unknown");
    expect(s.monitoringClaimSupported).toBe(false);
    expect(s.hoursSinceSync).toBeNull();
    expect(s.detail).toMatch(/has not been synchronised/i);
  });

  it("handles an unparseable timestamp without asserting freshness", () => {
    const s = getFreshnessStatus("not-a-date", NOW);
    expect(s.level).toBe("unknown");
    expect(s.monitoringClaimSupported).toBe(false);
  });

  it("is inclusive at the fresh boundary", () => {
    expect(getFreshnessStatus(hoursAgo(FRESH_LIMIT_HOURS), NOW).level).toBe("fresh");
  });

  it("is inclusive at the aging boundary", () => {
    expect(getFreshnessStatus(hoursAgo(AGING_LIMIT_HOURS), NOW).level).toBe("aging");
  });

  it("clamps a future timestamp to zero rather than reporting negative age", () => {
    const s = getFreshnessStatus(new Date(NOW.getTime() + 3_600_000), NOW);
    expect(s.hoursSinceSync).toBe(0);
    expect(s.level).toBe("fresh");
  });

  it("always surfaces the actual sync time in the label", () => {
    const s = getFreshnessStatus(new Date("2026-07-27T09:30:00Z"), NOW);
    expect(s.label).toContain("2026-07-27 09:30 UTC");
  });
});
