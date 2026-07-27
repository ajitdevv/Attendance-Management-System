import type { ReactNode } from 'react';

export function EmptyState({
  icon,
  title,
  description,
  action
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-red-200 bg-red-50 p-8 text-center">
      {icon ? <div className="mb-4 rounded-2xl bg-white p-3 text-red-600 shadow-sm">{icon}</div> : null}
      <h3 className="text-base font-semibold text-slate-950">{title}</h3>
      {description ? <p className="mt-1 max-w-md text-sm text-slate-500">{description}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
