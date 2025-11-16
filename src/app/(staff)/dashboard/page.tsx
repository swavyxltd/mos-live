import { DashboardContent } from '@/components/dashboard-content'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Dashboard | Madrasah OS',
  description: 'Staff dashboard overview',
}

export default function DashboardPage() {
  return <DashboardContent />
}
