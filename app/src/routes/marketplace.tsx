import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import type { Agent, AgentCategory } from "@/lib/types";
import { AgentCard } from "@/components/agent-card";
import { HireDialog } from "@/components/agent-dialogs";
import { useApp } from "@/lib/app-state";
import { useStardormCatalog } from "@/lib/hooks/use-stardorm-catalog";
import { Search, SlidersHorizontal } from "lucide-react";
import { CoinIcon } from "@/components/icons";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Slider } from "@/components/ui/slider";

export const Route = createFileRoute("/marketplace")({
  component: Marketplace,
});

function marketplaceAgents(list: Agent[]) {
  return list.filter((a) => a.id !== "beam-default");
}

function Marketplace() {
  const { isHired } = useApp();
  const { data: catalog, isPending, isError } = useStardormCatalog();
  const agents = React.useMemo(() => catalog?.agents ?? [], [catalog?.agents]);
  const listable = React.useMemo(() => marketplaceAgents(agents), [agents]);

  /** Category chips: only values that appear on at least one listable agent (filters stay consistent). */
  const categoryOptions = React.useMemo(() => {
    const set = new Set<AgentCategory>();
    for (const a of listable) {
      set.add(a.category);
    }
    const ordered = (["Payments", "Taxes", "Reports", "DeFi", "General"] as const).filter((c) =>
      set.has(c),
    );
    return ["All", ...ordered] as const;
  }, [listable]);

  const priceCeiling = React.useMemo(() => {
    let m = 0;
    for (const a of listable) {
      const p = a.pricePerMonth;
      if (p != null && Number.isFinite(p) && p > m) m = p;
    }
    return Math.max(0.1, Math.ceil(m || 0.1));
  }, [listable]);

  const [q, setQ] = React.useState("");
  const [cat, setCat] = React.useState<AgentCategory | "All">("All");
  const [maxPrice, setMaxPrice] = React.useState(30);
  const [sort, setSort] = React.useState<"reputation" | "price" | "hires">("reputation");
  const [hireTarget, setHireTarget] = React.useState<Agent | null>(null);

  React.useEffect(() => {
    setMaxPrice((prev) => (prev > priceCeiling ? priceCeiling : prev));
  }, [priceCeiling]);

  React.useEffect(() => {
    if (cat !== "All" && !categoryOptions.includes(cat)) {
      setCat("All");
    }
  }, [cat, categoryOptions]);

  const filtered = React.useMemo(() => {
    const qn = q.trim().toLowerCase();
    return listable
      .filter((a) => {
        if (cat !== "All" && a.category !== cat) return false;
        if (a.pricePerMonth != null && a.pricePerMonth > maxPrice) return false;
        if (qn) {
          const hay = [
            a.name,
            a.handle,
            a.category,
            a.tagline,
            ...a.skills,
            ...(a.skillHandles?.map((h) => `${h.handle} ${h.label}`) ?? []),
          ]
            .join(" ")
            .toLowerCase();
          if (!hay.includes(qn)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sort === "reputation") {
          const ar = a.reputation ?? -1;
          const br = b.reputation ?? -1;
          const d = br - ar;
          return d !== 0 ? d : a.name.localeCompare(b.name);
        }
        if (sort === "price") {
          const ap = a.pricePerMonth ?? Number.POSITIVE_INFINITY;
          const bp = b.pricePerMonth ?? Number.POSITIVE_INFINITY;
          const d = ap - bp;
          return d !== 0 ? d : a.name.localeCompare(b.name);
        }
        const ah = a.hires ?? -1;
        const bh = b.hires ?? -1;
        const d = bh - ah;
        return d !== 0 ? d : a.name.localeCompare(b.name);
      });
  }, [listable, q, cat, maxPrice, sort]);

  return (
    <div className="px-4 py-6 md:px-10 md:py-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-1">
          <div className="text-sm uppercase tracking-wider text-muted-foreground">Marketplace</div>
          <h1 className="text-2xl font-bold md:text-3xl">Hire AI agents on 0G</h1>
          <p className="max-w-xl text-sm text-muted-foreground">
            Discover payment, tax, reporting and DeFi agents. Pay monthly in 0G — fire any time.
          </p>
        </div>

        {/* Toolbar */}
        <div className="mt-6 flex flex-col gap-3 rounded-xl border border-border bg-surface p-3 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search agents, skills, categories…"
              className="h-10 border-transparent bg-surface-elevated pl-9"
            />
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-md border border-border px-2.5 py-2 text-sm">
              <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">Max</span>
              <div className="w-28">
                <Slider
                  value={[Math.min(maxPrice, priceCeiling)]}
                  onValueChange={(v) => setMaxPrice(v[0])}
                  min={0}
                  max={priceCeiling}
                  step={0.01}
                />
              </div>
              <span className="flex items-center gap-1 font-medium">
                <CoinIcon className="h-3.5 w-3.5 shrink-0" />
                {Math.min(maxPrice, priceCeiling)} 0G
              </span>
            </div>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as typeof sort)}
              className="rounded-md border border-border bg-surface-elevated px-2 py-2 text-sm"
            >
              <option value="reputation">Reputation</option>
              <option value="price">Price</option>
              <option value="hires">Most hired</option>
            </select>
          </div>
        </div>

        {/* Categories */}
        <div className="mt-4 flex flex-wrap gap-2">
          {categoryOptions.map((c) => (
            <button
              key={c}
              onClick={() => setCat(c as AgentCategory | "All")}
              className={cn(
                "rounded-full border px-3 py-1.5 text-sm transition-colors",
                cat === c
                  ? "border-(--border-medium) bg-pill text-pill-foreground"
                  : "border-border text-muted-foreground hover:bg-(--bg-hover) hover:text-foreground",
              )}
            >
              {c}
            </button>
          ))}
        </div>

        {/* Grid */}
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {isError ? (
            <div className="col-span-full rounded-xl border border-destructive/30 bg-surface-elevated p-8 text-center text-sm text-destructive">
              Could not load the marketplace. Try again in a moment.
            </div>
          ) : isPending ? (
            <div className="col-span-full rounded-xl border border-border bg-surface-elevated p-8 text-center text-sm text-muted-foreground">
              Loading agents…
            </div>
          ) : (
            filtered.map((a) => (
              <AgentCard
                key={a.id}
                agent={a}
                hired={isHired(a.id)}
                onHire={(ag) => setHireTarget(ag)}
              />
            ))
          )}
        </div>

        {!isError && filtered.length === 0 && (
          <div className="mt-12 rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            No agents match your filters.
          </div>
        )}
      </div>
      <HireDialog
        agent={hireTarget}
        open={!!hireTarget}
        onOpenChange={(o) => !o && setHireTarget(null)}
      />
    </div>
  );
}
