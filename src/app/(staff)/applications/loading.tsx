import { TableSkeleton } from '@/components/loading/skeleton'

export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="h-8 w-48 bg-[var(--muted)] rounded-[var(--radius)] animate-pulse" />
        <div className="flex gap-2">
          <div className="h-10 w-24 bg-[var(--muted)] rounded-[var(--radius)] animate-pulse" />
          <div className="h-10 w-24 bg-[var(--muted)] rounded-[var(--radius)] animate-pulse" />
        </div>
      </div>
      <TableSkeleton rows={6} />
    </div>
  )
}

