import type { ReactNode } from "react";

export const inputCls =
  "input w-full rounded-lg px-3 py-2 text-sm";

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
