import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export const metadata = {
  title: 'Privacy Policy | Madrasah OS',
  description: 'Privacy Policy for Madrasah OS',
}

export default function PrivacyPolicyPage() {
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
            Privacy Policy
          </h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            Last updated: {new Date().toLocaleDateString()}
          </p>
        </div>

        <div className="prose prose-sm max-w-none text-[var(--foreground)]">
          <div className="space-y-6">
            <section>
              <h2 className="text-xl font-semibold mb-3">1. Information We Collect</h2>
              <p className="text-[var(--muted-foreground)] mb-2">
                We collect information that you provide directly to us, including:
              </p>
              <ul className="list-disc pl-6 space-y-1 text-[var(--muted-foreground)]">
                <li>Account information (name, email, phone number)</li>
                <li>Student information (names, dates of birth, attendance records)</li>
                <li>Payment information (processed securely through Stripe)</li>
                <li>Organization information and settings</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">2. How We Use Your Information</h2>
              <p className="text-[var(--muted-foreground)]">
                We use the information we collect to:
              </p>
              <ul className="list-disc pl-6 mt-2 space-y-1 text-[var(--muted-foreground)]">
                <li>Provide, maintain, and improve our services</li>
                <li>Process payments and send invoices</li>
                <li>Send you technical notices and support messages</li>
                <li>Respond to your comments and questions</li>
                <li>Monitor and analyze usage patterns</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">3. Data Storage and Security</h2>
              <p className="text-[var(--muted-foreground)]">
                Your data is stored securely using industry-standard encryption and security measures. We use:
              </p>
              <ul className="list-disc pl-6 mt-2 space-y-1 text-[var(--muted-foreground)]">
                <li>Encrypted database connections (SSL/TLS)</li>
                <li>Secure password hashing (bcrypt)</li>
                <li>Regular security audits and updates</li>
                <li>Access controls and authentication</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">4. Data Sharing</h2>
              <p className="text-[var(--muted-foreground)]">
                We do not sell your personal information. We may share your information only:
              </p>
              <ul className="list-disc pl-6 mt-2 space-y-1 text-[var(--muted-foreground)]">
                <li>With service providers (Stripe for payments, Resend for emails) who are bound by confidentiality agreements</li>
                <li>When required by law or to protect our rights</li>
                <li>With your explicit consent</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">5. Your Rights (GDPR)</h2>
              <p className="text-[var(--muted-foreground)]">
                If you are located in the European Economic Area (EEA), you have certain data protection rights:
              </p>
              <ul className="list-disc pl-6 mt-2 space-y-1 text-[var(--muted-foreground)]">
                <li>Right to access your personal data</li>
                <li>Right to rectification of inaccurate data</li>
                <li>Right to erasure ("right to be forgotten")</li>
                <li>Right to restrict processing</li>
                <li>Right to data portability</li>
                <li>Right to object to processing</li>
              </ul>
              <p className="text-[var(--muted-foreground)] mt-2">
                To exercise these rights, please contact us through the support system.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">6. Data Retention</h2>
              <p className="text-[var(--muted-foreground)]">
                We retain your personal information for as long as your account is active or as needed to provide services. We may retain certain information as required by law or for legitimate business purposes.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">7. Cookies and Tracking</h2>
              <p className="text-[var(--muted-foreground)]">
                We use essential cookies for authentication and session management. We also use analytics cookies (Vercel Analytics) to understand how our service is used. You can control cookies through your browser settings.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">8. Children's Privacy</h2>
              <p className="text-[var(--muted-foreground)]">
                Our service is designed for educational institutions managing student information. We comply with applicable children's privacy laws and require parental consent for student data collection.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">9. Changes to This Policy</h2>
              <p className="text-[var(--muted-foreground)]">
                We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">10. Contact Us</h2>
              <p className="text-[var(--muted-foreground)]">
                If you have any questions about this Privacy Policy, please contact us through the support system in the application.
              </p>
            </section>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-[var(--border)]">
          <p className="text-sm text-[var(--muted-foreground)] text-center">
            ⚠️ <strong>Note:</strong> This is a template. Please review and customize this policy with legal counsel before going live, especially for GDPR compliance.
          </p>
        </div>
      </Card>
    </div>
  )
}

