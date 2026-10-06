export function CatalogSkeleton({ label }: { label: string }) {
  return <div role="status" aria-busy="true"><span className="sr-only">{label}</span>
    <div aria-hidden="true" className="tour-grid grid grid-cols-2 gap-4 p-4">
      {[1, 2, 3, 4].map((id) => <div key={id} className="tour-card rounded-2xl overflow-hidden border border-gray-100">
        <div className="catalog-card-image bg-skeleton animate-pulse" />
        <div className="catalog-card-body p-3 animate-pulse"><div className="h-4 w-1/3 rounded bg-skeleton" /><div className="h-10 rounded bg-skeleton" /><div className="h-8 rounded bg-skeleton" /><div className="h-8 rounded bg-skeleton" /><div className="h-5 w-1/2 rounded bg-skeleton" /></div>
      </div>)}
    </div>
  </div>;
}

export function DetailSkeleton({ label }: { label: string }) {
  return <div role="status" aria-busy="true" className="bg-white rounded-2xl overflow-hidden"><span className="sr-only">{label}</span>
    <div aria-hidden="true" className="animate-pulse"><div className="content-hero bg-skeleton" /><div className="p-4 lg:p-8 space-y-6"><div className="h-8 w-3/4 rounded bg-skeleton" /><div className="h-20 rounded bg-skeleton" /><div className="h-24 rounded bg-skeleton" /><div className="h-32 rounded bg-skeleton" /></div></div>
  </div>;
}
