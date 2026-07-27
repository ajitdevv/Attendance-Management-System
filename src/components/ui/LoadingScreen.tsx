import { Loader2 } from 'lucide-react';

export function LoadingScreen({ label = 'Loading workspace...' }: { label?: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-red-50 px-4">
      <div className="rounded-2xl border border-red-100 bg-white p-6 text-center shadow-soft">
        <Loader2 className="mx-auto h-7 w-7 animate-spin text-red-500" aria-hidden="true" />
        <p className="mt-3 text-sm font-medium text-slate-600">{label}</p>
      </div>
    </div>
  );
}
