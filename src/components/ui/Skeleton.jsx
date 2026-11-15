export function Skeleton({ className = "", style }) {
  return <span className={`skeleton ${className}`} style={style} aria-hidden="true" />;
}

export function VehicleCardSkeleton() {
  return (
    <div className="card" aria-hidden="true">
      <Skeleton className="skeleton--tag" />
      <Skeleton className="skeleton--title" />
      <Skeleton className="skeleton--line" />
      <Skeleton className="skeleton--price" />
    </div>
  );
}
