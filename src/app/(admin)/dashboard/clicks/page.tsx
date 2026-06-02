import { connection } from "next/server";
import { prisma } from "@/lib/db/prisma";

type TimePeriod = "today" | "7days" | "30days" | "custom";

interface ClicksPageProps {
  searchParams: Promise<{
    period?: TimePeriod;
    from?: string;
    to?: string;
  }>;
}

function getDateRange(
  period: TimePeriod,
  from?: string,
  to?: string
): { start: Date; end: Date } {
  const now = new Date();
  const end = to ? new Date(to) : now;

  switch (period) {
    case "today": {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      return { start, end };
    }
    case "7days": {
      const start = new Date(now);
      start.setDate(start.getDate() - 7);
      start.setHours(0, 0, 0, 0);
      return { start, end };
    }
    case "30days": {
      const start = new Date(now);
      start.setDate(start.getDate() - 30);
      start.setHours(0, 0, 0, 0);
      return { start, end };
    }
    case "custom": {
      const start = from ? new Date(from) : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return { start, end };
    }
    default: {
      const start = new Date(now);
      start.setDate(start.getDate() - 7);
      start.setHours(0, 0, 0, 0);
      return { start, end };
    }
  }
}

export default async function ClicksDashboardPage({ searchParams }: ClicksPageProps) {
  await connection();
  const params = await searchParams;
  const period: TimePeriod = params.period ?? "7days";
  const { start, end } = getDateRange(period, params.from, params.to);

  const clicksByProduct = await prisma.affiliateClick.groupBy({
    by: ["productId"],
    where: {
      timestamp: {
        gte: start,
        lte: end,
      },
    },
    _count: {
      id: true,
    },
    orderBy: {
      _count: {
        id: "desc",
      },
    },
  });

  const totalClicks = clicksByProduct.reduce(
    (sum, group) => sum + group._count.id,
    0
  );

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Affiliate Clicks Dashboard</h1>

      <TimePeriodFilter activePeriod={period} from={params.from} to={params.to} />

      <div className="mt-6 rounded-lg border border-border bg-background p-4">
        <p className="text-sm text-muted-foreground mb-4">
          Showing clicks from{" "}
          <span className="font-medium text-foreground">
            {start.toLocaleDateString()}
          </span>{" "}
          to{" "}
          <span className="font-medium text-foreground">
            {end.toLocaleDateString()}
          </span>
        </p>

        <p className="text-lg font-semibold mb-6">
          Total clicks: {totalClicks}
        </p>

        {clicksByProduct.length === 0 ? (
          <p className="text-muted-foreground">
            No clicks recorded for this period.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 font-medium">Product ID</th>
                <th className="text-right py-2 font-medium">Clicks</th>
              </tr>
            </thead>
            <tbody>
              {clicksByProduct.map((group) => (
                <tr
                  key={group.productId}
                  className="border-b border-border last:border-0"
                >
                  <td className="py-2">{group.productId}</td>
                  <td className="py-2 text-right tabular-nums">
                    {group._count.id}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function TimePeriodFilter({
  activePeriod,
  from,
  to,
}: {
  activePeriod: TimePeriod;
  from?: string;
  to?: string;
}) {
  const periods: { value: TimePeriod; label: string }[] = [
    { value: "today", label: "Today" },
    { value: "7days", label: "Last 7 days" },
    { value: "30days", label: "Last 30 days" },
    { value: "custom", label: "Custom range" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {periods.map((p) => (
          <a
            key={p.value}
            href={
              p.value === "custom"
                ? `?period=custom${from ? `&from=${from}` : ""}${to ? `&to=${to}` : ""}`
                : `?period=${p.value}`
            }
            className={`inline-flex items-center rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              activePeriod === p.value
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            }`}
          >
            {p.label}
          </a>
        ))}
      </div>

      {activePeriod === "custom" && (
        <form className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="period" value="custom" />
          <div className="space-y-1">
            <label htmlFor="from" className="text-xs font-medium text-muted-foreground">
              From
            </label>
            <input
              id="from"
              type="date"
              name="from"
              defaultValue={from ?? ""}
              className="rounded-md border border-border bg-background px-3 py-1.5 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="to" className="text-xs font-medium text-muted-foreground">
              To
            </label>
            <input
              id="to"
              type="date"
              name="to"
              defaultValue={to ?? ""}
              className="rounded-md border border-border bg-background px-3 py-1.5 text-sm"
            />
          </div>
          <button
            type="submit"
            className="inline-flex items-center rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/80 transition-colors"
          >
            Apply
          </button>
        </form>
      )}
    </div>
  );
}
