'use client'

import { useState, useEffect } from 'react'
import { X, Building2, Copy, CheckCircle, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface PaymentModalProps {
  isOpen: boolean
  onClose: () => void
  overdueAmount: number
  onPaymentSuccess: () => void
}

interface BankDetails {
  bankAccountName?: string
  bankSortCode?: string
  bankAccountNumber?: string
}

export function PaymentModal({ isOpen, onClose, overdueAmount, onPaymentSuccess }: PaymentModalProps) {
  const [bankDetails, setBankDetails] = useState<BankDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [copiedField, setCopiedField] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      fetchBankDetails()
    } else {
      // Reset state when modal closes
      setBankDetails(null)
      setLoading(true)
      setCopiedField(null)
    }
  }, [isOpen])

  const fetchBankDetails = async () => {
    try {
      const response = await fetch('/api/settings/organization')
      if (response.ok) {
        const data = await response.json()
        setBankDetails({
          bankAccountName: data.bankAccountName,
          bankSortCode: data.bankSortCode,
          bankAccountNumber: data.bankAccountNumber
        })
      } else {
        // Fallback to payment-methods endpoint
        const fallbackResponse = await fetch('/api/settings/payment-methods')
        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json()
          setBankDetails({
            bankAccountName: fallbackData.bankAccountName,
            bankSortCode: fallbackData.bankSortCode,
            bankAccountNumber: fallbackData.bankAccountNumber
          })
        }
      }
    } catch (error) {
      console.error('Error fetching bank details:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = async (text: string, field: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text)
        setCopiedField(field)
        setTimeout(() => setCopiedField(null), 2000)
      } else {
        // Fallback for browsers that don't support clipboard API
        const textArea = document.createElement('textarea')
        textArea.value = text
        textArea.style.position = 'fixed'
        textArea.style.left = '-999999px'
        document.body.appendChild(textArea)
        textArea.select()
        try {
          document.execCommand('copy')
          setCopiedField(field)
          setTimeout(() => setCopiedField(null), 2000)
        } catch (err) {
          console.error('Failed to copy text:', err)
        } finally {
          if (textArea && textArea.parentNode) {
            document.body.removeChild(textArea)
          }
        }
      }
    } catch (error) {
      console.error('Error copying to clipboard:', error)
    }
  }


  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-white/20 backdrop-blur-md flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="w-[95vw] sm:w-[90vw] md:w-[75vw] my-8 max-h-[90vh]">
        <Card className="border border-[var(--border)] shadow-lg overflow-hidden flex flex-col max-h-[90vh]">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-semibold text-[var(--foreground)]">
                Bank Transfer Details
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4 overflow-y-auto flex-1">
            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Amount to Pay:</span>
                <span className="text-lg font-bold text-gray-900">£{overdueAmount.toFixed(2)}</span>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                <p className="mt-4 text-sm text-gray-600">Loading bank details...</p>
              </div>
            ) : !bankDetails?.bankAccountName || !bankDetails?.bankSortCode || !bankDetails?.bankAccountNumber ? (
              <div className="text-center py-8">
                <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-sm text-gray-600">
                  Bank account details are not yet configured. Please contact the school office for payment instructions.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="bg-[var(--accent)]/30 p-3 rounded-lg border border-[var(--border)]">
                  <div className="flex items-center gap-2 mb-3">
                    <Building2 className="h-4 w-4 text-[var(--foreground)]" />
                    <h3 className="text-sm font-semibold text-[var(--foreground)]">Bank Transfer Information</h3>
                  </div>
                  
                  <div className="space-y-2.5">
                    <div>
                      <label className="text-sm font-medium text-[var(--muted-foreground)] mb-1 block">
                        Account Name
                      </label>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 p-2 bg-[var(--background)] border border-[var(--border)] rounded-md font-mono text-sm">
                          {bankDetails.bankAccountName}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCopy(bankDetails.bankAccountName || '', 'name')}
                          className="flex-shrink-0"
                        >
                          {copiedField === 'name' ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-[var(--muted-foreground)] mb-1 block">
                        Sort Code
                      </label>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 p-2 bg-[var(--background)] border border-[var(--border)] rounded-md font-mono text-sm">
                          {bankDetails.bankSortCode}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCopy(bankDetails.bankSortCode || '', 'sortCode')}
                          className="flex-shrink-0"
                        >
                          {copiedField === 'sortCode' ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-[var(--muted-foreground)] mb-1 block">
                        Account Number
                      </label>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 p-2 bg-[var(--background)] border border-[var(--border)] rounded-md font-mono text-sm">
                          {bankDetails.bankAccountNumber}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCopy(bankDetails.bankAccountNumber || '', 'accountNumber')}
                          className="flex-shrink-0"
                        >
                          {copiedField === 'accountNumber' ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                  <p className="text-xs text-gray-700">
                    <strong>Payment Instructions:</strong> Please transfer £{overdueAmount.toFixed(2)} to the bank account details above. 
                    Include your child's name as the payment reference. Once payment is received, it will be updated in your account.
                  </p>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button
                onClick={onClose}
                variant="default"
                size="sm"
              >
                Close
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
