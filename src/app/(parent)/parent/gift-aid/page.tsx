'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  FileText, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertCircle,
  Download,
  Info,
  Gift
} from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'

export default function ParentGiftAidPage() {
  const { data: session, status } = useSession()
  const [giftAidStatus, setGiftAidStatus] = useState<'YES' | 'NO' | 'NOT_SURE' | null>(null)
  const [giftAidData, setGiftAidData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    if (status === 'loading' || !session?.user?.id) return

    const fetchGiftAidStatus = async () => {
      try {
        const response = await fetch('/api/gift-aid/parent-status')
        if (response.ok) {
          const data = await response.json()
          setGiftAidStatus(data.status)
          setGiftAidData(data)
        } else {
          const error = await response.json()
          toast.error(error.error || 'Failed to load Gift Aid status')
        }
      } catch (error) {
        toast.error('Failed to load Gift Aid status')
      } finally {
        setLoading(false)
      }
    }

    fetchGiftAidStatus()
  }, [session, status])

  const handleUpdateStatus = async (newStatus: 'YES' | 'NO' | 'NOT_SURE') => {
    setUpdating(true)
    try {
      const response = await fetch('/api/gift-aid/parent-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update status')
      }

      const data = await response.json()
      setGiftAidStatus(data.status)
      setGiftAidData(data)
      toast.success('Gift Aid status updated successfully')
    } catch (error: any) {
      toast.error(error.message || 'Failed to update status')
    } finally {
      setUpdating(false)
    }
  }

  const getStatusBadge = () => {
    switch (giftAidStatus) {
      case 'YES':
        return (
          <Badge className="bg-green-100 text-green-800 border border-green-200">
            <CheckCircle className="h-3 w-3 mr-1" />
            Active
          </Badge>
        )
      case 'NO':
        return (
          <Badge className="bg-red-100 text-red-800 border border-red-200">
            <XCircle className="h-3 w-3 mr-1" />
            Declined
          </Badge>
        )
      case 'NOT_SURE':
        return (
          <Badge className="bg-yellow-100 text-yellow-800 border border-yellow-200">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        )
      default:
        return null
    }
  }

  const getStatusDescription = () => {
    switch (giftAidStatus) {
      case 'YES':
        return 'Your payments are eligible for Gift Aid. The madrasah can claim an extra 25% from HMRC on your behalf.'
      case 'NO':
        return 'You have declined Gift Aid. Your payments will not be included in Gift Aid claims.'
      case 'NOT_SURE':
        return 'You have not yet confirmed your Gift Aid status. Please contact the madrasah if you would like to enable Gift Aid.'
      default:
        return 'Your Gift Aid status has not been set. Please contact the madrasah for more information.'
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Gift Aid</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage your Gift Aid declaration and view your contribution details
        </p>
      </div>

      {/* Current Status Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Gift className="h-5 w-5 text-indigo-600" />
                Your Gift Aid Status
              </CardTitle>
              <CardDescription className="mt-1">
                {getStatusDescription()}
              </CardDescription>
            </div>
            {getStatusBadge()}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {giftAidData && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-700">Status</p>
                <p className="text-sm text-gray-900 mt-1">
                  {giftAidStatus === 'YES' ? 'Active' : giftAidStatus === 'NO' ? 'Declined' : 'Pending'}
                </p>
              </div>
              {giftAidData.declaredAt && (
                <div>
                  <p className="text-sm font-medium text-gray-700">Declaration Date</p>
                  <p className="text-sm text-gray-900 mt-1">
                    {format(new Date(giftAidData.declaredAt), 'dd MMM yyyy')}
                  </p>
                </div>
              )}
              {giftAidData.totalAmount && giftAidStatus === 'YES' && (
                <>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Total Payments</p>
                    <p className="text-sm text-gray-900 mt-1">
                      £{giftAidData.totalAmount.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Gift Aid Value (25%)</p>
                    <p className="text-sm text-green-600 font-semibold mt-1">
                      £{(giftAidData.totalAmount * 0.25).toFixed(2)}
                    </p>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Update Status Buttons */}
          {giftAidStatus !== 'YES' && (
            <div className="pt-4 border-t">
              <p className="text-sm font-medium text-gray-700 mb-3">Update Your Status</p>
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => handleUpdateStatus('YES')}
                  disabled={updating || giftAidStatus === 'YES'}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Enable Gift Aid
                </Button>
                <Button
                  onClick={() => handleUpdateStatus('NO')}
                  disabled={updating || giftAidStatus === 'NO'}
                  variant="outline"
                  className="border-red-300 text-red-700 hover:bg-red-50"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Decline Gift Aid
                </Button>
                {giftAidStatus !== 'NOT_SURE' && (
                  <Button
                    onClick={() => handleUpdateStatus('NOT_SURE')}
                    disabled={updating}
                    variant="outline"
                  >
                    <Clock className="h-4 w-4 mr-2" />
                    Not Sure Yet
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Information Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5 text-indigo-600" />
            About Gift Aid
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">What is Gift Aid?</h3>
            <p className="text-sm text-gray-600">
              Gift Aid allows the madrasah to claim an extra 25% from HMRC on your payments, at no extra cost to you. 
              This means if you pay £100, the madrasah can claim an additional £25 from the government.
            </p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Who can use Gift Aid?</h3>
            <p className="text-sm text-gray-600">
              You must be a UK taxpayer and have paid enough Income Tax or Capital Gains Tax to cover the amount 
              the madrasah will claim. The tax you pay must be at least equal to the amount the madrasah will reclaim 
              (25% of your payments).
            </p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">How does it work?</h3>
            <p className="text-sm text-gray-600">
              When you enable Gift Aid, the madrasah will include your payments in their Gift Aid submission to HMRC. 
              HMRC will then pay the madrasah an additional 25% of your payments, which helps support the madrasah's work.
            </p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Important:</strong> By enabling Gift Aid, you confirm that you are a UK taxpayer and that you 
              understand the madrasah will claim Gift Aid on your payments. If you are not a UK taxpayer or your tax 
              situation changes, please update your status immediately.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Declaration Form Download */}
      {giftAidStatus === 'YES' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-indigo-600" />
              Gift Aid Declaration
            </CardTitle>
            <CardDescription>
              Download a copy of your Gift Aid declaration for your records
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={async () => {
                try {
                  const response = await fetch('/api/gift-aid/parent-declaration')
                  if (!response.ok) throw new Error('Failed to download')
                  const blob = await response.blob()
                  const url = window.URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = `gift-aid-declaration-${format(new Date(), 'yyyy-MM-dd')}.pdf`
                  document.body.appendChild(a)
                  a.click()
                  window.URL.revokeObjectURL(url)
                  document.body.removeChild(a)
                  toast.success('Declaration downloaded successfully')
                } catch (error) {
                  toast.error('Failed to download declaration')
                }
              }}
              variant="outline"
            >
              <Download className="h-4 w-4 mr-2" />
              Download Declaration
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

