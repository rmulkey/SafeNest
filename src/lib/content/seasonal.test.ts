import { describe, it, expect } from "vitest";
import {
  parseMonthDay,
  isValidWindow,
  isInSeason,
  selectInSeason,
  isOutOfSeason,
} from "./seasonal";

/** Local date construction, matching how these helpers are called at render time. */
const on = (month: number, day: number) => new Date(2026, month - 1, day);

const JULY_4TH = { startMonthDay: "06-15", endMonthDay: "07-05" };
const WINTER_HOLIDAYS = { startMonthDay: "11-15", endMonthDay: "01-05" };
const BACK_TO_SCHOOL = { startMonthDay: "07-20", endMonthDay: "09-15" };

describe("parseMonthDay", () => {
  it("parses valid MM-DD into a comparable ordinal", () => {
    expect(parseMonthDay("01-01")).toBe(101);
    expect(parseMonthDay("07-04")).toBe(704);
    expect(parseMonthDay("12-31")).toBe(1231);
  });

  it("rejects malformed or out-of-range values", () => {
    for (const bad of ["7-4", "2026-07-04", "13-01", "00-10", "07-00", "07-32", "", "abc"]) {
      expect(parseMonthDay(bad)).toBeNull();
    }
  });

  it("rejects non-string input rather than throwing", () => {
    for (const bad of [null, undefined, 704, {}, []]) {
      expect(parseMonthDay(bad)).toBeNull();
    }
  });

  it("accepts Feb 29 so leap-day windows stay valid every year", () => {
    expect(parseMonthDay("02-29")).toBe(229);
  });
});

describe("isValidWindow", () => {
  it("accepts a well-formed window", () => {
    expect(isValidWindow(JULY_4TH)).toBe(true);
  });

  it("rejects missing, partial, or malformed windows", () => {
    expect(isValidWindow(undefined)).toBe(false);
    expect(isValidWindow(null)).toBe(false);
    expect(isValidWindow({})).toBe(false);
    expect(isValidWindow({ startMonthDay: "06-15" })).toBe(false);
    expect(isValidWindow({ startMonthDay: "06-15", endMonthDay: "bad" })).toBe(false);
  });
});

describe("isInSeason - non-wrapping window", () => {
  it("is open inside the window", () => {
    expect(isInSeason(JULY_4TH, on(7, 1))).toBe(true);
  });

  it("is inclusive of both boundaries", () => {
    expect(isInSeason(JULY_4TH, on(6, 15))).toBe(true);
    expect(isInSeason(JULY_4TH, on(7, 5))).toBe(true);
  });

  it("is closed just outside the boundaries", () => {
    expect(isInSeason(JULY_4TH, on(6, 14))).toBe(false);
    expect(isInSeason(JULY_4TH, on(7, 6))).toBe(false);
  });

  it("is closed on the far side of the year", () => {
    expect(isInSeason(JULY_4TH, on(1, 20))).toBe(false);
    expect(isInSeason(JULY_4TH, on(12, 25))).toBe(false);
  });

  it("is closed in late July, matching the real-world case that motivated this", () => {
    // A Fourth of July guide should not be featured on July 28.
    expect(isInSeason(JULY_4TH, on(7, 28))).toBe(false);
  });
});

describe("isInSeason - window wrapping the new year", () => {
  it("is open before the year boundary", () => {
    expect(isInSeason(WINTER_HOLIDAYS, on(12, 20))).toBe(true);
  });

  it("is open after the year boundary", () => {
    expect(isInSeason(WINTER_HOLIDAYS, on(1, 2))).toBe(true);
  });

  it("is inclusive of both wrapping boundaries", () => {
    expect(isInSeason(WINTER_HOLIDAYS, on(11, 15))).toBe(true);
    expect(isInSeason(WINTER_HOLIDAYS, on(1, 5))).toBe(true);
  });

  it("is closed in the gap between end and start", () => {
    expect(isInSeason(WINTER_HOLIDAYS, on(1, 6))).toBe(false);
    expect(isInSeason(WINTER_HOLIDAYS, on(7, 1))).toBe(false);
    expect(isInSeason(WINTER_HOLIDAYS, on(11, 14))).toBe(false);
  });
});

describe("isInSeason - invalid input", () => {
  it("treats a missing or malformed window as never in season", () => {
    expect(isInSeason(undefined, on(7, 1))).toBe(false);
    expect(isInSeason({}, on(7, 1))).toBe(false);
    expect(isInSeason({ startMonthDay: "x", endMonthDay: "y" }, on(7, 1))).toBe(false);
  });
});

describe("selectInSeason", () => {
  const posts = [
    { slug: "july-4th", seasonal: JULY_4TH },
    { slug: "winter", seasonal: WINTER_HOLIDAYS },
    { slug: "back-to-school", seasonal: BACK_TO_SCHOOL },
    { slug: "evergreen" }, // no seasonal window
  ];

  it("returns only the currently open seasonal items", () => {
    expect(selectInSeason(posts, on(7, 1)).map((p) => p.slug)).toEqual(["july-4th"]);
    expect(selectInSeason(posts, on(8, 20)).map((p) => p.slug)).toEqual(["back-to-school"]);
    expect(selectInSeason(posts, on(12, 20)).map((p) => p.slug)).toEqual(["winter"]);
  });

  it("never includes evergreen (non-seasonal) items", () => {
    for (const d of [on(1, 1), on(7, 1), on(8, 20), on(12, 20)]) {
      expect(selectInSeason(posts, d).some((p) => p.slug === "evergreen")).toBe(false);
    }
  });

  it("returns an empty list when nothing is in season", () => {
    // Late Oct: after back-to-school, before winter holidays.
    expect(selectInSeason(posts, on(10, 20))).toEqual([]);
  });

  it("can return multiple items when windows overlap", () => {
    // July 20 is both the tail of the July 4th window? No - it ends Jul 5.
    // Use overlapping windows explicitly.
    const overlapping = [
      { slug: "a", seasonal: { startMonthDay: "07-01", endMonthDay: "07-31" } },
      { slug: "b", seasonal: { startMonthDay: "07-15", endMonthDay: "08-15" } },
    ];
    expect(selectInSeason(overlapping, on(7, 20)).map((p) => p.slug)).toEqual(["a", "b"]);
  });
});

describe("isOutOfSeason", () => {
  it("is true for a seasonal item whose window is closed", () => {
    expect(isOutOfSeason({ seasonal: JULY_4TH }, on(7, 28))).toBe(true);
  });

  it("is false for a seasonal item currently in season", () => {
    expect(isOutOfSeason({ seasonal: JULY_4TH }, on(7, 1))).toBe(false);
  });

  it("is false for evergreen items, which are never out of season", () => {
    expect(isOutOfSeason({}, on(7, 28))).toBe(false);
    expect(isOutOfSeason({ seasonal: undefined }, on(7, 28))).toBe(false);
  });
});
