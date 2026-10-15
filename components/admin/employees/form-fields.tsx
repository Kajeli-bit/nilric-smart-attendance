import type { ReactNode } from "react";

export const inputCls =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#714B67] focus:outline-none";

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-600">{label}</span>
      {children}
    </label>
  );
}
