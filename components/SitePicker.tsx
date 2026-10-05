"use client";

export interface WorkerSiteOption {
  id: string;
  name: string;
}

interface SitePickerProps {
  sites: WorkerSiteOption[];
  value: string;
  onChange: (siteId: string) => void;
  disabled?: boolean;
  loading?: boolean;
}

export function SitePicker({
  sites,
  value,
  onChange,
  disabled = false,
  loading = false,
}: SitePickerProps) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-slate-700">Work location</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled || loading}
        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800"
      >
        <option value="">Head office (default)</option>
        {sites.map((site) => (
          <option key={site.id} value={site.id}>
            {site.name}
          </option>
        ))}
      </select>
      {loading && (
        <span className="mt-1 block text-xs text-slate-500">
          Loading project sites…
        </span>
      )}
    </label>
  );
}
