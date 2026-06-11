import { useState } from "react";
import type { ContentAttributes } from "../types";
import { useApp } from "../state/AppContext";
import { DAY_NAMES } from "../data/constants";
import { Field } from "./ui";

/** Form atribut konten (§2.7) — semua opsional, dipakai per konten & bulk edit. */
export function AttributeForm({
  attributes, isVideo, isCarousel, onChange,
}: {
  attributes: ContentAttributes;
  isVideo: boolean;
  isCarousel: boolean;
  onChange: (a: ContentAttributes) => void;
}) {
  const { config } = useApp();
  const opt = config.attributeOptions;
  const a = attributes;
  const set = (patch: Partial<ContentAttributes>) => onChange({ ...a, ...patch });
  const [customKey, setCustomKey] = useState("");
  const [customVal, setCustomVal] = useState("");

  const selectFor = (
    label: string,
    value: string | undefined,
    options: string[],
    key: keyof ContentAttributes
  ) => (
    <Field label={label}>
      <select className="input" value={value ?? ""} onChange={(e) => set({ [key]: e.target.value || undefined })}>
        <option value="">—</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </Field>
  );

  return (
    <div className="space-y-5">
      <p className="text-xs text-slate-500">
        Semua field opsional, tapi semakin lengkap atribut, semakin tajam Pattern Analysis di report.
        Kelola daftar nilai di Settings.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {selectFor("Hook Type", a.hookType, opt.hookType, "hookType")}
        <div className="md:col-span-2">
          <Field label="Hook Mechanism — kenapa hook ini bekerja">
            <input className="input" value={a.hookMechanism ?? ""} onChange={(e) => set({ hookMechanism: e.target.value || undefined })} />
          </Field>
        </div>

        <Field label="Ada talent?">
          <select
            className="input"
            value={a.hasTalent == null ? "" : a.hasTalent ? "ya" : "tidak"}
            onChange={(e) => set({ hasTalent: e.target.value === "" ? undefined : e.target.value === "ya" })}
          >
            <option value="">—</option>
            <option value="ya">Ya</option>
            <option value="tidak">Tidak</option>
          </select>
        </Field>
        <Field label="Talent (multi)">
          <div className="flex flex-wrap gap-2 pt-1">
            {opt.talentNames.length === 0 && <span className="text-xs text-slate-400">Tambah nama talent di Settings</span>}
            {opt.talentNames.map((t) => (
              <label key={t} className="flex items-center gap-1 text-sm">
                <input
                  type="checkbox"
                  checked={a.talentNames?.includes(t) ?? false}
                  onChange={(e) => {
                    const names = e.target.checked
                      ? [...(a.talentNames ?? []), t]
                      : (a.talentNames ?? []).filter((x) => x !== t);
                    set({ talentNames: names.length ? names : undefined, talentCount: names.length || undefined, hasTalent: names.length ? true : a.hasTalent });
                  }}
                />
                {t}
              </label>
            ))}
          </div>
        </Field>
        <Field label="Gender Talent">
          <select className="input" value={a.talentGender ?? ""} onChange={(e) => set({ talentGender: (e.target.value || undefined) as ContentAttributes["talentGender"] })}>
            <option value="">—</option>
            <option value="laki">Laki-laki</option>
            <option value="perempuan">Perempuan</option>
            <option value="campuran">Campuran</option>
          </select>
        </Field>

        {selectFor("Konsep", a.concept, opt.concept, "concept")}
        {selectFor("Struktur Cerita", a.storyStructure, opt.storyStructure, "storyStructure")}
        <Field label="Pola Skrip/Copy">
          <input className="input" value={a.scriptPattern ?? ""} onChange={(e) => set({ scriptPattern: e.target.value || undefined })} />
        </Field>

        <div className="md:col-span-3">
          <Field label="Trigger Psikologis (multi)">
            <div className="flex flex-wrap gap-2 pt-1">
              {opt.heuristicBias.map((h) => (
                <label key={h} className="flex items-center gap-1 text-sm">
                  <input
                    type="checkbox"
                    checked={a.heuristicBias?.includes(h) ?? false}
                    onChange={(e) => {
                      const v = e.target.checked
                        ? [...(a.heuristicBias ?? []), h]
                        : (a.heuristicBias ?? []).filter((x) => x !== h);
                      set({ heuristicBias: v.length ? v : undefined });
                    }}
                  />
                  {h}
                </label>
              ))}
            </div>
          </Field>
        </div>

        {isVideo && (
          <Field label="Durasi (detik)">
            <input type="number" className="input" value={a.durationSec ?? ""}
              onChange={(e) => set({ durationSec: e.target.value === "" ? undefined : Number(e.target.value) })} />
          </Field>
        )}
        {isCarousel && (
          <Field label="Jumlah Slide">
            <input type="number" className="input" value={a.slideCount ?? ""}
              onChange={(e) => set({ slideCount: e.target.value === "" ? undefined : Number(e.target.value) })} />
          </Field>
        )}
        {selectFor("Gaya Visual", a.visualStyle, opt.visualStyle, "visualStyle")}
        <Field label="Latar / Setting" >
          <input className="input" placeholder='mis. "studio", "outdoor", "dapur"' value={a.background ?? ""}
            onChange={(e) => set({ background: e.target.value || undefined })} />
        </Field>
        {selectFor("Sound", a.soundType, opt.soundType, "soundType")}

        {selectFor("CTA", a.ctaType, opt.ctaType, "ctaType")}
        <Field label="Posisi CTA">
          <select className="input" value={a.ctaPlacement ?? ""} onChange={(e) => set({ ctaPlacement: (e.target.value || undefined) as ContentAttributes["ctaPlacement"] })}>
            <option value="">—</option>
            {["awal", "tengah", "akhir", "caption"].map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </Field>
        {selectFor("Gaya Caption", a.captionStyle, opt.captionStyle, "captionStyle")}

        <Field label="Hari Posting" hint="Auto dari tanggal tayang bila kosong.">
          <select className="input" value={a.postDay ?? ""} onChange={(e) => set({ postDay: e.target.value || undefined })}>
            <option value="">—</option>
            {DAY_NAMES.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </Field>
        <Field label="Jam Posting (0–23)">
          <input type="number" min={0} max={23} className="input" value={a.postHour ?? ""}
            onChange={(e) => set({ postHour: e.target.value === "" ? undefined : Number(e.target.value) })} />
        </Field>
      </div>

      <div>
        <div className="label">Faktor Custom</div>
        <div className="space-y-1.5">
          {Object.entries(a.custom ?? {}).map(([k, v]) => (
            <div key={k} className="flex items-center gap-2 text-sm">
              <span className="font-medium">{k}:</span> {v}
              <button
                className="text-rose-500 text-xs cursor-pointer hover:underline"
                onClick={() => {
                  const c = { ...a.custom };
                  delete c[k];
                  set({ custom: Object.keys(c).length ? c : undefined });
                }}
              >
                hapus
              </button>
            </div>
          ))}
        </div>
        <div className="mt-2 flex gap-2">
          <input className="input !w-40" placeholder="nama faktor" value={customKey} onChange={(e) => setCustomKey(e.target.value)} />
          <input className="input !w-40" placeholder="nilai" value={customVal} onChange={(e) => setCustomVal(e.target.value)} />
          <button
            className="btn-secondary"
            disabled={!customKey.trim() || !customVal.trim()}
            onClick={() => {
              set({ custom: { ...a.custom, [customKey.trim()]: customVal.trim() } });
              setCustomKey(""); setCustomVal("");
            }}
          >
            + Tambah
          </button>
        </div>
      </div>
    </div>
  );
}
