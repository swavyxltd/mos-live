import { ensurePermissionsExist } from '../src/lib/staff-permissions-db'

async function main() {
  console.log('Seeding permissions...')
  await ensurePermissionsExist()
  console.log('Permissions seeded successfully!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    const { prisma } = await import('../src/lib/prisma')
    await prisma.$disconnect()
  })

