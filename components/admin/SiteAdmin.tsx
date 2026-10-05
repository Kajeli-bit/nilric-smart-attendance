"use client";

import { useCallback, useEffect, useState } from "react";
import type { Site } from "@/lib/types";
import { GoogleSiteMap } from "@/components/admin/GoogleSiteMap";
import { Spinner } from "@/components/Spinner";

interface FormState {
  id: string | null;
  name: string;
  address: string;
  lat: number | null;
  lng: number | null;
  radiusM: number;
  active: boolean;
}

const emptyForm: FormState = {
  id: null,
  name: "",
  address: "",
  lat: null,
  lng: null,
  radiusM: 100,
  active: true,
};

export function SiteAdmin() {
  const apiKey =
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() || null;

  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/sites", { credentials: "include" });
      if (res.status === 401 || res.status === 403) {
        setError("Admin Google sign-in required");
        setLoading(false);
        return;
      }
      const data = (await res.json()) as { sites?: Site[]; message?: string };
      if (!res.ok) {
        setError(data.message || "Failed to load sites");
        return;
      }
      setSites(data.sites ?? []);
      setError(null);
    } catch {
      setError("Failed to load sites");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (!cancelled) void load();
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [load]);

  function startCreate() {
    setForm(emptyForm);
    setNotice(null);
  }

  function startEdit(site: Site) {
    setForm({
      id: site.id,
      name: site.name,
      address: site.address ?? "",
      lat: site.lat,
      lng: site.lng,
      radiusM: site.radius_m,
      active: site.active,
    });
    setNotice(null);
  }

  function onMapPick(coords: { lat: number; lng: number }, address?: string | null) {
    setForm((prev) => ({
      ...prev,
      lat: coords.lat,
      lng: coords.lng,
      address: address && !prev.address.trim() ? address : prev.address || address || "",
    }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || form.lat === null || form.lng === null) {
      setError("Name and map coordinates are required");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: form.name.trim(),
        address: form.address.trim() || null,
        lat: form.lat,
        lng: form.lng,
        radiusM: Number(form.radiusM) || 100,
        active: form.active,
      };
      const res = form.id
        ? await fetch(`/api/admin/sites/${form.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(payload),
          })
        : await fetch("/api/admin/sites", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(payload),
          });
      const data = (await res.json()) as {
        site?: Site;
        message?: string;
        error?: string;
      };
      if (!res.ok) {
        setError(data.message || data.error || "Failed to save site");
        return;
      }
      setNotice(form.id ? "Site updated" : "Site created");
      startCreate();
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(site: Site) {
    const res = await fetch(`/api/admin/sites/${site.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ active: !site.active }),
    });
    if (res.ok) await load();
    else setError("Failed to update site status");
  }

  if (loading) {
    return (
      <div className="inline-flex items-center gap-2 text-sm text-slate-500">
        <Spinner size={16} className="text-brand-600" />
        Loading sites…
      </div>
    );
  }

  if (error && sites.length === 0 && !form.id) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
        Register remote project sites on the map. Workers can pick any{" "}
        <strong>active</strong> site at check-in. HQ remains the default when no
        site is selected.
      </div>

      {!apiKey && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-semibold">Google Maps key missing</p>
          <p className="mt-1">
            Set <code>NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> on Vercel (browser
            key with Places + Maps JavaScript + Geocoding enabled), then
            redeploy. Map search will not work until then.
          </p>
        </div>
      )}

      {notice && (
        <div className="rounded-xl border border-brand-200 bg-brand-50 p-3 text-sm text-brand-900">
          {notice}
        </div>
      )}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <form onSubmit={save} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-slate-900">
            {form.id ? "Edit site" : "New site"}
          </h2>
          {form.id && (
            <button
              type="button"
              onClick={startCreate}
              className="text-sm text-brand-700 underline"
            >
              Cancel edit
            </button>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">Name</span>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
              className="w-full rounded-xl border border-slate-300 px-3 py-2"
              placeholder="e.g. Site A — Kariakoo"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">
              Radius (meters)
            </span>
            <input
              type="number"
              min={1}
              value={form.radiusM}
              onChange={(e) =>
                setForm((f) => ({ ...f, radiusM: Number(e.target.value) }))
              }
              className="w-full rounded-xl border border-slate-300 px-3 py-2"
            />
          </label>
        </div>

        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-700">
            Address (from map / Places)
          </span>
          <input
            value={form.address}
            onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
            className="w-full rounded-xl border border-slate-300 px-3 py-2"
            placeholder="Auto-filled when you pick on the map"
          />
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">Latitude</span>
            <input
              value={form.lat ?? ""}
              readOnly
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-600"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">Longitude</span>
            <input
              value={form.lng ?? ""}
              readOnly
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-600"
            />
          </label>
        </div>

        <GoogleSiteMap
          apiKey={apiKey || ""}
          lat={form.lat}
          lng={form.lng}
          markerLabel={form.name || "Site"}
          onPick={onMapPick}
          disabled={saving}
        />

        <label className="inline-flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={form.active}
            onChange={(e) =>
              setForm((f) => ({ ...f, active: e.target.checked }))
            }
          />
          Active (visible to workers at check-in)
        </label>

        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={saving || !apiKey}
            className="btn-primary rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-50"
          >
            {saving ? "Saving…" : form.id ? "Update site" : "Create site"}
          </button>
        </div>
      </form>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Address</th>
              <th className="px-4 py-3 font-medium">Lat / Lng</th>
              <th className="px-4 py-3 font-medium">Radius</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sites.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                  No sites yet. Create one above.
                </td>
              </tr>
            )}
            {sites.map((site) => (
              <tr key={site.id} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-3 font-medium text-slate-900">{site.name}</td>
                <td className="max-w-xs px-4 py-3 text-slate-600">
                  {site.address || "—"}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {site.lat.toFixed(5)}, {site.lng.toFixed(5)}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {Math.round(site.radius_m)}m
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                      site.active
                        ? "bg-brand-50 text-brand-800 ring-1 ring-brand-100"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {site.active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => startEdit(site)}
                      className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleActive(site)}
                      className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      {site.active ? "Deactivate" : "Activate"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
