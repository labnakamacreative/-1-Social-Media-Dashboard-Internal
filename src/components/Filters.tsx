/* eslint-disable react-refresh/only-export-components */
import { useMemo, useState } from "react";
import type { ContentItem } from "../types";
import { useApp } from "../state/AppContext";
import {
  CHANNEL_LABELS, CONTENT_TYPE_LABELS, CONTENT_TYPES, PRIORITIES,
} from "../data/constants";

export interface FilterState {
  search: string;
  channel: string;
  pillar: string;
  pic: string;
  campaign: string;
  priority: string;
  contentType: string;
}

const EMPTY: FilterState = {
  search: "", channel: "", pillar: "", pic: "", campaign: "", priority: "", contentType: "",
};

export function useContentFilters(items: ContentItem[]) {
  const [filters, setFilters] = useState<FilterState>(EMPTY);
  const filtered = useMemo(() => {
    const q = filters.search.toLowerCase();
    return items.filter((it) =>
      (!q || it.title.toLowerCase().includes(q) || it.id.toLowerCase().includes(q) ||
        it.hook.toLowerCase().includes(q) || (it.campaign ?? "").toLowerCase().includes(q)) &&
      (!filters.channel || it.channel.includes(filters.channel as ContentItem["channel"][number])) &&
      (!filters.pillar || it.pillar === filters.pillar) &&
      (!filters.pic || it.currentPIC === filters.pic) &&
      (!filters.campaign || it.campaign === filters.campaign) &&
      (!filters.priority || it.priority === filters.priority) &&
      (!filters.contentType || it.contentType === filters.contentType)
    );
  }, [items, filters]);
  return { filters, setFilters, filtered };
}

export function FilterBar({
  filters, setFilters, items,
}: {
  filters: FilterState;
  setFilters: (f: FilterState) => void;
  items: ContentItem[];
}) {
  const { config } = useApp();
  const campaigns = useMemo(
    () => [...new Set(items.map((it) => it.campaign).filter(Boolean))] as string[],
    [items]
  );
  const set = (patch: Partial<FilterState>) => setFilters({ ...filters, ...patch });
  const sel = "input !w-auto text-xs";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        className="input !w-52"
        placeholder="Cari judul / id / hook…"
        value={filters.search}
        onChange={(e) => set({ search: e.target.value })}
      />
      <select className={sel} value={filters.channel} onChange={(e) => set({ channel: e.target.value })}>
        <option value="">Semua channel</option>
        {config.channels.map((c) => <option key={c} value={c}>{CHANNEL_LABELS[c]}</option>)}
      </select>
      <select className={sel} value={filters.pillar} onChange={(e) => set({ pillar: e.target.value })}>
        <option value="">Semua pillar</option>
        {config.pillars.map((p) => <option key={p.name} value={p.name}>{p.name}</option>)}
      </select>
      <select className={sel} value={filters.pic} onChange={(e) => set({ pic: e.target.value })}>
        <option value="">Semua PIC</option>
        {config.members.filter((m) => m.active).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
      </select>
      {campaigns.length > 0 && (
        <select className={sel} value={filters.campaign} onChange={(e) => set({ campaign: e.target.value })}>
          <option value="">Semua campaign</option>
          {campaigns.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      )}
      <select className={sel} value={filters.priority} onChange={(e) => set({ priority: e.target.value })}>
        <option value="">Semua prioritas</option>
        {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
      </select>
      <select className={sel} value={filters.contentType} onChange={(e) => set({ contentType: e.target.value })}>
        <option value="">Semua tipe</option>
        {CONTENT_TYPES.map((t) => <option key={t} value={t}>{CONTENT_TYPE_LABELS[t]}</option>)}
      </select>
      {Object.values(filters).some(Boolean) && (
        <button className="text-xs text-indigo-600 hover:underline cursor-pointer" onClick={() => setFilters(EMPTY)}>
          Reset filter
        </button>
      )}
    </div>
  );
}
