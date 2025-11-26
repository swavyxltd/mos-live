import { prisma } from '../src/lib/prisma'

async function checkBankDetails() {
  try {
    // Find the org for test islamic school
    const org = await prisma.org.findFirst({
      where: {
        name: {
          contains: 'test',
          mode: 'insensitive'
        }
      },
      select: {
        id: true,
        name: true,
        slug: true,
        bankAccountName: true,
        bankSortCode: true,
        bankAccountNumber: true,
        bankTransferEnabled: true,
        cashPaymentEnabled: true
      }
    })

    if (!org) {
      console.log('No organization found with "test" in the name')
      return
    }

    console.log('\n=== Organization Bank Details ===')
    console.log(`Org Name: ${org.name}`)
    console.log(`Org Slug: ${org.slug}`)
    console.log(`Bank Transfer Enabled: ${org.bankTransferEnabled}`)
    console.log(`Cash Payment Enabled: ${org.cashPaymentEnabled}`)
    console.log(`\nBank Details:`)
    console.log(`  Account Name: ${org.bankAccountName || 'NOT SET'}`)
    console.log(`  Sort Code: ${org.bankSortCode || 'NOT SET'}`)
    console.log(`  Account Number: ${org.bankAccountNumber || 'NOT SET'}`)
    
    const hasBankDetails = !!(org.bankAccountName && org.bankSortCode && org.bankAccountNumber)
    console.log(`\nBank Details Configured: ${hasBankDetails ? 'YES' : 'NO'}`)
    
    // Also check admin user
    const adminUser = await prisma.user.findFirst({
      where: {
        email: 'admin@test.com'
      },
      select: {
        id: true,
        email: true,
        name: true
      }
    })
    
    if (adminUser) {
      console.log(`\nAdmin User Found: ${adminUser.email} (${adminUser.name})`)
    } else {
      console.log('\nAdmin user admin@test.com not found')
    }
    
  } catch (error) {
    console.error('Error checking bank details:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkBankDetails()

