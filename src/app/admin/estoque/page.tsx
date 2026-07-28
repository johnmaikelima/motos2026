import { listStockSyncLogs } from "@/lib/stock-sync";
import StockSyncPanel, { type SyncLog } from "@/components/admin/StockSyncPanel";

export const dynamic = "force-dynamic";
export const metadata = { title: "Estoque" };

type Change = { cdItem: string; de: number; para: number };

function parseDetails(raw: string | null): Change[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export default async function EstoquePage() {
  const rows = await listStockSyncLogs(30);
  const logs: SyncLog[] = rows.map((l) => ({
    id: l.id,
    createdAt: l.createdAt.toISOString(),
    source: l.source,
    ok: l.ok,
    checked: l.checked,
    updated: l.updated,
    notFound: l.notFound,
    message: l.message,
    details: parseDetails(l.details),
  }));

  return (
    <div>
      <h1 className="heading-display mb-2 text-3xl text-white">Estoque</h1>
      <p className="mb-6 text-sm text-gray-400">
        Sincronize o estoque com a Laquila (pelo SKU) e acompanhe o histórico de atualizações.
      </p>
      <StockSyncPanel logs={logs} />
    </div>
  );
}
