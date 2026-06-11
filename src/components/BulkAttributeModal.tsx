import { useState } from "react";
import type { BrandConfig, ContentAttributes, ContentItem } from "../types";
import { useApp } from "../state/AppContext";
import { Field, Modal } from "./ui";

type BulkField = {
  key: keyof ContentAttributes;
  label: string;
  kind: "select" | "text" | "number";
  optionsKey?: keyof BrandConfig["attributeOptions"];
};

const BULK_FIELDS: BulkField[] = [
  { key: "hookType", label: "Hook Type", kind: "select", optionsKey: "hookType" },
  { key: "concept", label: "Konsep", kind: "select", optionsKey: "concept" },
  { key: "storyStructure", label: "Struktur Cerita", kind: "select", optionsKey: "storyStructure" },
  { key: "visualStyle", label: "Gaya Visual", kind: "select", optionsKey: "visualStyle" },
  { key: "soundType", label: "Sound", kind: "select", optionsKey: "soundType" },
  { key: "ctaType", label: "CTA", kind: "select", optionsKey: "ctaType" },
  { key: "captionStyle", label: "Gaya Caption", kind: "select", optionsKey: "captionStyle" },
  { key: "background", label: "Latar/Setting", kind: "text" },
  { key: "durationSec", label: "Durasi (detik)", kind: "number" },
  { key: "postHour", label: "Jam Posting", kind: "number" },
];

/** Pengisian atribut massal per faktor (§13.7 & acceptance #17). */
export function BulkAttributeModal({ items, onClose }: { items: ContentItem[]; onClose: () => void }) {
  const app = useApp();
  const [field, setField] = useState<BulkField>(BULK_FIELDS[0]);

  const setValue = (item: ContentItem, raw: string) => {
    const value = raw === ""
      ? undefined
      : field.kind === "number" ? Number(raw) : raw;
    app.updateItem(item.id, { attributes: { ...item.attributes, [field.key]: value } });
  };

  return (
    <Modal title="Bulk Edit Atribut — per faktor" onClose={onClose} wide>
      <div className="mb-4 max-w-xs">
        <Field label="Pilih faktor yang mau diisi">
          <select
            className="input"
            value={field.key}
            onChange={(e) => setField(BULK_FIELDS.find((f) => f.key === e.target.value)!)}
          >
            {BULK_FIELDS.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
          </select>
        </Field>
      </div>

      <div className="max-h-96 overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 border-b border-slate-200 bg-slate-50">
            <tr>
              <th className="px-2 py-2 text-left text-xs font-semibold text-slate-500">Konten</th>
              <th className="w-56 px-2 py-2 text-left text-xs font-semibold text-slate-500">{field.label}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => {
              const current = it.attributes[field.key];
              return (
                <tr key={it.id} className="border-b border-slate-100">
                  <td className="px-2 py-1.5">
                    <span className="font-mono text-[10px] text-slate-400">{it.id}</span>{" "}
                    <span className="font-medium">{it.title}</span>
                  </td>
                  <td className="px-2 py-1.5">
                    {field.kind === "select" ? (
                      <select
                        className="input"
                        value={(current as string) ?? ""}
                        onChange={(e) => setValue(it, e.target.value)}
                      >
                        <option value="">— kosong —</option>
                        {app.config.attributeOptions[field.optionsKey!].map((o) => (
                          <option key={o} value={o}>{o}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        className="input"
                        type={field.kind === "number" ? "number" : "text"}
                        value={(current as string | number | undefined) ?? ""}
                        onChange={(e) => setValue(it, e.target.value)}
                      />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {items.length === 0 && <div className="p-6 text-center text-sm text-slate-400">Tidak ada konten dalam scope ini.</div>}
      </div>

      <div className="mt-4 flex justify-end">
        <button className="btn-primary" onClick={onClose}>Selesai</button>
      </div>
    </Modal>
  );
}
