import { useRef, useState } from "react";
import type { BrandConfig, Channel, Goal, Industry, Role, TeamMember } from "../types";
import { useApp } from "../state/AppContext";
import {
  CHANNELS, CHANNEL_LABELS, GOALS, GOAL_LABELS, INDUSTRIES, INDUSTRY_LABELS,
  ROLES, ROLE_LABELS,
} from "../data/constants";
import { industryDefaults, recommendConfigForTeamSize } from "../logic/rules";
import { exportCSV, exportJSON, importJSON } from "../data/store";
import { ConfirmDialog, Field } from "../components/ui";

export function SettingsView() {
  const app = useApp();
  const cfg = app.config;
  const [recommendation, setRecommendation] = useState<Partial<BrandConfig> | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [newMemberName, setNewMemberName] = useState("");

  const upd = (patch: Partial<BrandConfig>) => app.updateConfig({ ...cfg, ...patch });

  const updMembers = (members: TeamMember[]) => {
    upd({ members });
    // tawarkan auto-rekomendasi saat jumlah member berubah (§3.1)
    const activeCount = members.filter((m) => m.active).length;
    const rec = recommendConfigForTeamSize(activeCount);
    if (
      rec.approvalEnabled !== cfg.approvalEnabled ||
      rec.handoffTrackingEnabled !== cfg.handoffTrackingEnabled ||
      rec.roleBasedViewsEnabled !== cfg.roleBasedViewsEnabled
    ) {
      setRecommendation(rec);
    }
  };

  return (
    <div className="max-w-4xl">
      <h1 className="mb-4 text-xl font-bold">Settings — Konfigurasi Brand</h1>

      {recommendation && (
        <div className="card mb-4 border-indigo-300 bg-indigo-50 p-4">
          <div className="text-sm font-semibold text-indigo-800">Rekomendasi konfigurasi untuk ukuran tim saat ini</div>
          <p className="mt-1 text-sm text-indigo-700">
            Approval: <b>{recommendation.approvalEnabled ? "aktif" : "nonaktif"}</b> ·
            Handoff tracking: <b>{recommendation.handoffTrackingEnabled ? "aktif" : "nonaktif"}</b> ·
            Role-based views: <b>{recommendation.roleBasedViewsEnabled ? "aktif" : "nonaktif"}</b>
          </p>
          <div className="mt-2 flex gap-2">
            <button className="btn-primary" onClick={() => { upd(recommendation); setRecommendation(null); }}>Terapkan</button>
            <button className="btn-secondary" onClick={() => setRecommendation(null)}>Abaikan</button>
          </div>
        </div>
      )}

      <Section title="Brand">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Field label="Nama brand">
            <input className="input" value={cfg.brandName} onChange={(e) => upd({ brandName: e.target.value })} />
          </Field>
          <Field label="Industri" hint="Mengubah default expiry & panel yang ditonjolkan.">
            <select
              className="input"
              value={cfg.industry}
              onChange={(e) => {
                const industry = e.target.value as Industry;
                upd({ industry, ...industryDefaults(industry) });
              }}
            >
              {INDUSTRIES.map((i) => <option key={i} value={i}>{INDUSTRY_LABELS[i]}</option>)}
            </select>
          </Field>
          <Field label="Brand guideline URL">
            <input className="input" value={cfg.brandGuidelineUrl ?? ""} onChange={(e) => upd({ brandGuidelineUrl: e.target.value || undefined })} />
          </Field>
          <Field label="Primary goals (multi)">
            <div className="flex flex-wrap gap-2 pt-1">
              {GOALS.map((g) => (
                <label key={g} className="flex items-center gap-1 text-sm">
                  <input
                    type="checkbox"
                    checked={cfg.primaryGoals.includes(g)}
                    onChange={(e) => {
                      const goals: Goal[] = e.target.checked
                        ? [...cfg.primaryGoals, g]
                        : cfg.primaryGoals.filter((x) => x !== g);
                      if (goals.length) upd({ primaryGoals: goals });
                    }}
                  />
                  {GOAL_LABELS[g]}
                </label>
              ))}
            </div>
          </Field>
          <Field label="Channel aktif">
            <div className="flex flex-wrap gap-2 pt-1">
              {CHANNELS.map((c) => (
                <label key={c} className="flex items-center gap-1 text-sm">
                  <input
                    type="checkbox"
                    checked={cfg.channels.includes(c)}
                    onChange={(e) => {
                      const channels: Channel[] = e.target.checked
                        ? [...cfg.channels, c]
                        : cfg.channels.filter((x) => x !== c);
                      if (channels.length) upd({ channels });
                    }}
                  />
                  {CHANNEL_LABELS[c]}
                </label>
              ))}
            </div>
          </Field>
        </div>
      </Section>

      <Section title={`Tim & Role (${cfg.members.filter((m) => m.active).length} aktif)`}>
        <div className="space-y-2">
          {cfg.members.map((m) => (
            <div key={m.id} className="flex flex-wrap items-center gap-3 rounded-md border border-slate-200 p-2">
              <input
                className="input !w-36"
                value={m.name}
                onChange={(e) => updMembers(cfg.members.map((x) => x.id === m.id ? { ...x, name: e.target.value } : x))}
              />
              <div className="flex flex-1 flex-wrap gap-x-2 gap-y-0.5">
                {ROLES.filter((r) => cfg.rolesEnabled.includes(r) || m.roles.includes(r)).map((r) => (
                  <label key={r} className="flex items-center gap-1 text-xs">
                    <input
                      type="checkbox"
                      checked={m.roles.includes(r)}
                      onChange={(e) => {
                        const roles: Role[] = e.target.checked ? [...m.roles, r] : m.roles.filter((x) => x !== r);
                        updMembers(cfg.members.map((x) => x.id === m.id ? { ...x, roles } : x));
                      }}
                    />
                    {ROLE_LABELS[r]}
                  </label>
                ))}
              </div>
              <label className="flex items-center gap-1 text-xs">
                <input
                  type="checkbox"
                  checked={m.active}
                  onChange={(e) => updMembers(cfg.members.map((x) => x.id === m.id ? { ...x, active: e.target.checked } : x))}
                />
                aktif
              </label>
            </div>
          ))}
          <div className="flex gap-2">
            <input
              className="input !w-48"
              placeholder="Nama anggota baru"
              value={newMemberName}
              onChange={(e) => setNewMemberName(e.target.value)}
            />
            <button
              className="btn-secondary"
              disabled={!newMemberName.trim()}
              onClick={() => {
                updMembers([
                  ...cfg.members,
                  { id: `m${Date.now().toString(36)}`, name: newMemberName.trim(), roles: [], active: true },
                ]);
                setNewMemberName("");
              }}
            >
              + Tambah anggota
            </button>
          </div>
        </div>
        <div className="mt-3">
          <Field label="Role yang aktif di sistem" hint="Role nonaktif disembunyikan dari pilihan.">
            <div className="flex flex-wrap gap-x-3 gap-y-1 pt-1">
              {ROLES.map((r) => (
                <label key={r} className="flex items-center gap-1 text-xs">
                  <input
                    type="checkbox"
                    checked={cfg.rolesEnabled.includes(r)}
                    onChange={(e) => upd({
                      rolesEnabled: e.target.checked
                        ? [...cfg.rolesEnabled, r]
                        : cfg.rolesEnabled.filter((x) => x !== r),
                    })}
                  />
                  {ROLE_LABELS[r]}
                </label>
              ))}
            </div>
          </Field>
        </div>
      </Section>

      <Section title="Perilaku Sistem">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {(
            [
              ["approvalEnabled", "Approval workflow", "Konten KOL/affiliate/ads wajib approve sebelum tayang."],
              ["handoffTrackingEnabled", "Handoff tracking", "Lacak PIC per tahap + deadline tahap."],
              ["roleBasedViewsEnabled", "My Queue per role", "Tiap anggota melihat antrian tugasnya sendiri."],
            ] as [keyof BrandConfig, string, string][]
          ).map(([key, label, hint]) => (
            <label key={key} className="flex items-start gap-2 rounded-md border border-slate-200 p-3 text-sm">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={Boolean(cfg[key])}
                onChange={(e) => upd({ [key]: e.target.checked })}
              />
              <span>
                <span className="font-medium">{label}</span>
                <span className="block text-xs text-slate-400">{hint}</span>
              </span>
            </label>
          ))}
        </div>
      </Section>

      <Section title="Banking & Posting">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Field label="Bank sehat — minimal">
            <input type="number" className="input" value={cfg.bankHealthyMin}
              onChange={(e) => upd({ bankHealthyMin: Number(e.target.value) })} />
          </Field>
          <Field label="Bank sehat — maksimal">
            <input type="number" className="input" value={cfg.bankHealthyMax}
              onChange={(e) => upd({ bankHealthyMax: Number(e.target.value) })} />
          </Field>
          <Field label="Expiry trend default (hari)">
            <input type="number" className="input" value={cfg.defaultTrendExpiryDays}
              onChange={(e) => upd({ defaultTrendExpiryDays: Number(e.target.value) })} />
          </Field>
          <Field label="Bucket durasi video (detik)" hint="Pisahkan koma, mis. 15,30,60">
            <input
              className="input"
              value={cfg.durationBuckets.join(",")}
              onChange={(e) => upd({
                durationBuckets: e.target.value.split(",").map((x) => Number(x.trim())).filter((x) => x > 0).sort((a, b) => a - b),
              })}
            />
          </Field>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-4 md:grid-cols-4">
          {cfg.channels.map((c) => (
            <Field key={c} label={`Target posting/minggu — ${CHANNEL_LABELS[c]}`}>
              <input
                type="number" className="input"
                value={cfg.weeklyPostTargets[c] ?? 0}
                onChange={(e) => upd({ weeklyPostTargets: { ...cfg.weeklyPostTargets, [c]: Number(e.target.value) } })}
              />
            </Field>
          ))}
        </div>
      </Section>

      <Section title="Pillar Konten">
        <ListEditor
          rows={cfg.pillars.map((p) => [p.name, p.description])}
          headers={["Nama", "Deskripsi"]}
          onChange={(rows) => upd({ pillars: rows.map(([name, description]) => ({ name, description })) })}
        />
      </Section>

      <Section title="Daftar Nilai Atribut (untuk Pattern Analysis)">
        <p className="mb-2 text-xs text-slate-500">Satu nilai per baris. Tiap brand bisa menambah kosakata sendiri (mis. hook type baru).</p>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {(Object.keys(cfg.attributeOptions) as (keyof BrandConfig["attributeOptions"])[]).map((key) => (
            <Field key={key} label={key}>
              <textarea
                className="input text-xs" rows={4}
                value={cfg.attributeOptions[key].join("\n")}
                onChange={(e) => upd({
                  attributeOptions: {
                    ...cfg.attributeOptions,
                    [key]: e.target.value.split("\n").map((x) => x.trim()).filter(Boolean),
                  },
                })}
              />
            </Field>
          ))}
        </div>
      </Section>

      <Section title="Data — Backup & Migrasi">
        <div className="flex flex-wrap gap-2">
          <button className="btn-primary" onClick={() => exportJSON(app.data)}>Export JSON</button>
          <button className="btn-secondary" onClick={() => exportCSV(app.data)}>Export CSV (konten)</button>
          <button className="btn-secondary" onClick={() => fileRef.current?.click()}>Import JSON</button>
          <input
            ref={fileRef} type="file" accept=".json" className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              try {
                const data = await importJSON(f);
                if (window.confirm("Import akan MENGGANTI seluruh data saat ini. Lanjutkan?")) {
                  app.replaceAll(data);
                }
              } catch (err) {
                alert(`Import gagal: ${err instanceof Error ? err.message : err}`);
              }
              e.target.value = "";
            }}
          />
          <button className="btn-danger ml-auto" onClick={() => setConfirmReset(true)}>Reset ke data demo</button>
        </div>
      </Section>

      {confirmReset && (
        <ConfirmDialog
          message="Reset akan menghapus seluruh data dan mengembalikan data demo. Export dulu bila perlu. Lanjutkan?"
          confirmLabel="Reset"
          onConfirm={() => { app.resetToSeed(); setConfirmReset(false); }}
          onCancel={() => setConfirmReset(false)}
        />
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card mb-4 p-4">
      <h2 className="mb-3 text-sm font-bold">{title}</h2>
      {children}
    </div>
  );
}

function ListEditor({
  rows, headers, onChange,
}: {
  rows: string[][];
  headers: string[];
  onChange: (rows: string[][]) => void;
}) {
  return (
    <div className="space-y-1.5">
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${headers.length}, 1fr) auto` }}>
        {headers.map((h) => <div key={h} className="label !mb-0">{h}</div>)}
        <div />
      </div>
      {rows.map((row, i) => (
        <div key={i} className="grid gap-2" style={{ gridTemplateColumns: `repeat(${headers.length}, 1fr) auto` }}>
          {row.map((cell, j) => (
            <input
              key={j} className="input"
              value={cell}
              onChange={(e) => {
                const next = rows.map((r, ri) => ri === i ? r.map((c, ci) => (ci === j ? e.target.value : c)) : r);
                onChange(next);
              }}
            />
          ))}
          <button className="text-rose-500 text-sm cursor-pointer px-1" onClick={() => onChange(rows.filter((_, ri) => ri !== i))}>✕</button>
        </div>
      ))}
      <button className="btn-secondary" onClick={() => onChange([...rows, headers.map(() => "")])}>+ Tambah baris</button>
    </div>
  );
}
