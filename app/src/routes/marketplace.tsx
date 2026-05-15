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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Slider } from "@/components/ui/slider";
import { EmptyState } from "@/components/empty-state";
import { AgentCardGridSkeleton, PageRoutePending } from "@/components/page-shimmer";
import { isRegistryTokenIdOneAgent } from "@/lib/registry-token-one-agent";

export const Route = createFileRoute("/marketplace")({
  component: Marketplace,
  pendingComponent: () => <PageRoutePending variant="marketplace" />,
});

/** Registry token #1 is the default Beam agent (`beam-default`, subgraph `chain-1`); not hireable on marketplace. */
function marketplaceAgents(list: Agent[]) {
  return list.filter((a) => !isRegistryTokenIdOneAgent(a) && a.isCloned !== true);
}

type MarketplaceSort = "reputation" | "price" | "hires";

const SORT_OPTIONS: { value: MarketplaceSort; label: string }[] = [
  { value: "reputation", label: "Reputation" },
  { value: "price", label: "Price" },
  { value: "hires", label: "Most employers" },
];

function MarketplaceSortSelect({
  value,
  onChange,
  triggerClassName,
}: {
  value: MarketplaceSort;
  onChange: (value: MarketplaceSort) => void;
  triggerClassName?: string;
}) {
  const activeLabel = SORT_OPTIONS.find((o) => o.value === value)?.label ?? "Sort";
  return (
    <Select value={value} onValueChange={(v) => onChange(v as MarketplaceSort)}>
      <SelectTrigger
        aria-label="Sort agents"
        className={cn(
          "h-8 w-full gap-1 border-border bg-surface-elevated px-2.5 text-xs font-medium shadow-none",
          triggerClassName,
        )}
      >
        <SelectValue>{activeLabel}</SelectValue>
      </SelectTrigger>
      <SelectContent align="end">
        {SORT_OPTIONS.map((o) => (
          <SelectItem key={o.value} value={o.value} className="text-xs">
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function MarketplaceCategorySelect({
  value,
  options,
  onChange,
  triggerClassName,
}: {
  value: AgentCategory | "All";
  options: readonly (AgentCategory | "All")[];
  onChange: (value: AgentCategory | "All") => void;
  triggerClassName?: string;
}) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as AgentCategory | "All")}>
      <SelectTrigger
        aria-label="Filter by category"
        className={cn(
          "h-8 w-full gap-1 border-border bg-surface-elevated px-2.5 text-xs font-medium shadow-none",
          triggerClassName,
        )}
      >
        <SelectValue>{value}</SelectValue>
      </SelectTrigger>
      <SelectContent align="start">
        {options.map((c) => (
          <SelectItem key={c} value={c} className="text-xs">
            {c}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
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
    const ordered = (
      ["Payments", "Taxes", "Reports", "DeFi", "Compliance", "General"] as const
    ).filter((c) => set.has(c));
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
  const [sort, setSort] = React.useState<MarketplaceSort>("reputation");
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

        {/* Filters: 2 lines on mobile; single row on desktop */}
        <div className="mt-6 flex flex-col gap-2 rounded-xl border border-border bg-surface p-2.5 sm:gap-3 sm:p-4 md:flex-row md:items-center md:gap-4">
          <div className="relative min-w-0 w-full flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground md:left-3 md:h-4 md:w-4" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search agents, skills, categories…"
              className="h-9 w-full border-transparent bg-surface-elevated pl-8 text-sm md:h-10 md:pl-9"
            />
          </div>
          <div className="flex min-w-0 flex-col gap-2 md:hidden">
            <div className="grid grid-cols-2 gap-2">
              <MarketplaceCategorySelect
                value={cat}
                options={categoryOptions}
                onChange={setCat}
              />
              <MarketplaceSortSelect value={sort} onChange={setSort} />
            </div>
            <div className="flex min-h-8 w-full min-w-0 items-center gap-1.5 rounded-md border border-border px-2 py-1.5 text-xs">
              <SlidersHorizontal className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden />
              <span className="shrink-0 text-muted-foreground">Max</span>
              <div className="min-w-0 flex-1 px-0.5">
                <Slider
                  value={[Math.min(maxPrice, priceCeiling)]}
                  onValueChange={(v) => setMaxPrice(v[0])}
                  min={0}
                  max={priceCeiling}
                  step={0.01}
                />
              </div>
              <span className="flex shrink-0 items-center gap-0.5 whitespace-nowrap font-medium tabular-nums">
                <CoinIcon className="h-3 w-3 shrink-0" />
                {Math.min(maxPrice, priceCeiling)} 0G
              </span>
            </div>
          </div>

          <div className="hidden w-full min-w-0 shrink-0 items-center gap-3 md:flex md:w-auto">
            <div className="flex min-h-10 min-w-[12rem] items-center gap-2 rounded-md border border-border px-2.5 py-2 text-sm lg:min-w-[14rem]">
              <SlidersHorizontal className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
              <span className="shrink-0 text-muted-foreground">Max</span>
              <div className="min-w-0 flex-1 px-0.5">
                <Slider
                  value={[Math.min(maxPrice, priceCeiling)]}
                  onValueChange={(v) => setMaxPrice(v[0])}
                  min={0}
                  max={priceCeiling}
                  step={0.01}
                />
              </div>
              <span className="flex shrink-0 items-center gap-1 whitespace-nowrap font-medium tabular-nums">
                <CoinIcon className="h-3.5 w-3.5 shrink-0" />
                {Math.min(maxPrice, priceCeiling)} 0G
              </span>
            </div>
            <MarketplaceSortSelect
              value={sort}
              onChange={setSort}
              triggerClassName="h-10 w-[10.5rem] text-sm"
            />
          </div>
        </div>

        {/* Categories — chips on desktop only */}
        <div className="mt-4 hidden flex-wrap gap-2 md:flex">
          {categoryOptions.map((c) => (
            <button
              key={c}
              onClick={() => setCat(c as AgentCategory | "All")}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1.5 text-sm transition-colors",
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
            <AgentCardGridSkeleton count={6} className="col-span-full" />
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

        {!isError && !isPending && filtered.length === 0 && (
          <div className="mt-12">
            <EmptyState
              icon={Search}
              title="No agents match your filters"
              description="Try clearing search, widening the price range, or choosing a different category to see more of the catalog."
            />
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
