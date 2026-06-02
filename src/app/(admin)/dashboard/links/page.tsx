import { connection } from "next/server";
import { prisma } from "@/lib/db/prisma";

export default async function AdminLinksPage() {
  // Opt out of prerendering: this admin page must render per-request (it reads
  // the live database and should never be statically generated at build time).
  await connection();

  const unhealthyLinks = await prisma.affiliateLinkStatus.findMany({
    where: { isHealthy: false },
    orderBy: { flaggedAt: "desc" },
  });

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Affiliate Link Health Dashboard</h1>

      {unhealthyLinks.length === 0 ? (
        <p className="text-muted-foreground">
          All affiliate links are healthy. No flagged links found.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Destination URL</th>
                <th className="px-4 py-3 text-left font-medium">Product ID</th>
                <th className="px-4 py-3 text-left font-medium">Partner ID</th>
                <th className="px-4 py-3 text-left font-medium">HTTP Status</th>
                <th className="px-4 py-3 text-left font-medium">Last Checked</th>
                <th className="px-4 py-3 text-left font-medium">Flagged At</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {unhealthyLinks.map((link) => (
                <tr key={link.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 max-w-xs truncate" title={link.destinationUrl}>
                    <a
                      href={link.destinationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      {link.destinationUrl}
                    </a>
                  </td>
                  <td className="px-4 py-3">{link.productId}</td>
                  <td className="px-4 py-3">{link.partnerId}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
                      {link.httpStatus ?? "Timeout"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {link.lastChecked.toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="px-4 py-3">
                    {link.flaggedAt
                      ? link.flaggedAt.toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-4 text-sm text-muted-foreground">
        Showing {unhealthyLinks.length} flagged link{unhealthyLinks.length !== 1 ? "s" : ""}
      </p>
    </main>
  );
}
