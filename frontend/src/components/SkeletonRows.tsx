export function SkeletonRows({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3" data-testid="loading-skeleton">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="h-24 animate-pulse rounded-2xl bg-muted/70" />
      ))}
    </div>
  );
}
