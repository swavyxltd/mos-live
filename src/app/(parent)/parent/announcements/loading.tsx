import { TableSkeleton } from '@/components/loading/skeleton'

export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-48 bg-[var(--muted)] rounded-[var(--radius)] animate-pulse mb-6" />
      <TableSkeleton rows={6} />
    </div>
  )
}

