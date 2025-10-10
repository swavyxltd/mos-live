const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'file:./prisma/dev.db'
    }
  }
})

async function testDatabase() {
  try {
    console.log('Testing database connection...')
    
    // Check if demo org exists
    const demoOrg = await prisma.org.findUnique({
      where: { slug: 'demo' }
    })
    
    if (!demoOrg) {
      console.log('Creating demo organization...')
      await prisma.org.create({
        data: {
          name: 'Demo Madrasah',
          slug: 'demo',
          timezone: 'Europe/London'
        }
      })
      console.log('Demo organization created!')
    } else {
      console.log('Demo organization already exists:', demoOrg.name)
    }
    
    console.log('Database test successful!')
  } catch (error) {
    console.error('Database test failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testDatabase()
