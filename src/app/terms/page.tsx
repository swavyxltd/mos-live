import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export const metadata = {
  title: 'Terms of Service | Madrasah OS',
  description: 'Terms of Service for Madrasah OS',
}

export default function TermsOfServicePage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-[var(--background)]">
      <Card className="w-full max-w-4xl p-8">
        <div className="mb-6">
          <Button asChild variant="ghost" className="mb-4">
            <Link href="/auth/signin">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Sign In
            </Link>
          </Button>
          <h1 className="text-3xl font-bold text-[var(--foreground)] mb-2">
            Terms of Service
          </h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            Last updated: {new Date().toLocaleDateString()}
          </p>
        </div>

        <div className="prose prose-sm max-w-none text-[var(--foreground)]">
          <div className="space-y-6">
            <section>
              <h2 className="text-xl font-semibold mb-3">1. Acceptance of Terms</h2>
              <p className="text-[var(--muted-foreground)]">
                By accessing and using Madrasah OS, you accept and agree to be bound by the terms and provision of this agreement.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">2. Use License</h2>
              <p className="text-[var(--muted-foreground)]">
                Permission is granted to temporarily use Madrasah OS for your organization's management purposes. This is the grant of a license, not a transfer of title, and under this license you may not:
              </p>
              <ul className="list-disc pl-6 mt-2 space-y-1 text-[var(--muted-foreground)]">
                <li>Modify or copy the materials</li>
                <li>Use the materials for any commercial purpose or for any public display</li>
                <li>Attempt to reverse engineer any software contained in Madrasah OS</li>
                <li>Remove any copyright or other proprietary notations from the materials</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">3. User Accounts</h2>
              <p className="text-[var(--muted-foreground)]">
                You are responsible for maintaining the confidentiality of your account and password. You agree to accept responsibility for all activities that occur under your account.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">4. Payment Terms</h2>
              <p className="text-[var(--muted-foreground)]">
                Subscription fees are billed monthly based on the number of active students. Payments are processed through Stripe. You agree to provide accurate payment information and authorize us to charge your payment method.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">5. Data and Privacy</h2>
              <p className="text-[var(--muted-foreground)]">
                Your data is stored securely and is only accessible by authorized users within your organization. We implement industry-standard security measures to protect your data. Please review our Privacy Policy for more information.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">6. Termination</h2>
              <p className="text-[var(--muted-foreground)]">
                We reserve the right to terminate or suspend access to your account immediately, without prior notice, for conduct that we believe violates these Terms of Service or is harmful to other users, us, or third parties.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">7. Limitation of Liability</h2>
              <p className="text-[var(--muted-foreground)]">
                In no event shall Madrasah OS or its suppliers be liable for any damages arising out of the use or inability to use the service.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">8. Contact Information</h2>
              <p className="text-[var(--muted-foreground)]">
                If you have any questions about these Terms of Service, please contact us through the support system in the application.
              </p>
            </section>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-[var(--border)]">
          <p className="text-xs text-[var(--muted-foreground)] text-center">
            ⚠️ <strong>Note:</strong> This is a template. Please review and customize these terms with legal counsel before going live.
          </p>
        </div>
      </Card>
    </div>
  )
}

