import { cn } from '@/lib/utils'

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-[var(--radius)] bg-[var(--muted)]/80',
        className
      )}
      {...props}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/60 to-transparent dark:via-white/10 motion-safe:animate-[shimmer_1.6s_infinite] motion-reduce:hidden"
      />
    </div>
  )
}

// Backwards compatible alias
export function ShimmerSkeleton({ className, ...props }: SkeletonProps) {
  return <Skeleton className={className} {...props} />
}

// Card skeleton
export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-6', className)}>
      <ShimmerSkeleton className="h-6 w-32 mb-4" />
      <ShimmerSkeleton className="h-4 w-full mb-2" />
      <ShimmerSkeleton className="h-4 w-3/4" />
    </div>
  )
}

// Table skeleton
export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] overflow-hidden">
      {/* Table Header */}
      <div className="border-b border-[var(--border)] p-4">
        <div className="flex gap-4">
          <ShimmerSkeleton className="h-4 w-24" />
          <ShimmerSkeleton className="h-4 w-32" />
          <ShimmerSkeleton className="h-4 w-28" />
          <ShimmerSkeleton className="h-4 w-20 ml-auto" />
        </div>
      </div>
      
      {/* Table Rows */}
      <div className="divide-y divide-[var(--border)]">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="p-4">
            <div className="flex gap-4 items-center">
              <ShimmerSkeleton className="h-4 w-24" />
              <ShimmerSkeleton className="h-4 w-32" />
              <ShimmerSkeleton className="h-4 w-28" />
              <ShimmerSkeleton className="h-4 w-20 ml-auto" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Stat card skeleton
export function StatCardSkeleton() {
  return (
    <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-6">
      <ShimmerSkeleton className="h-4 w-24 mb-4" />
      <ShimmerSkeleton className="h-8 w-32 mb-2" />
      <ShimmerSkeleton className="h-3 w-20" />
    </div>
  )
}

// Page skeleton (for dashboard-like pages)
export function PageSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <ShimmerSkeleton className="h-8 w-48" />
        <ShimmerSkeleton className="h-10 w-32" />
      </div>
      
      {/* Stat Cards Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>
      
      {/* Main Content Cards */}
      <div className="grid gap-6 md:grid-cols-2">
        <CardSkeleton />
        <CardSkeleton />
      </div>
    </div>
  )
}

