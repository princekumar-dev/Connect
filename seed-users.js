import { connectToDatabase } from './lib/mongo.js'
import { User } from './models.js'
import bcrypt from 'bcryptjs'

const testUsers = [
  {
    email: 'admin@msec.edu.in',
    password: 'admin@123',
    role: 'admin',
    name: 'System Administrator',
    department: 'IT'
  },
  {
    email: 'principal@msec.edu.in',
    password: 'principal@123',
    role: 'principal',
    name: 'College Principal',
    department: 'Administration'
  },
  {
    email: 'hod@msec.edu.in',
    password: 'hod@123',
    role: 'hod',
    name: 'Head of Department',
    department: 'Computer Science'
  },
  {
    email: 'secretary@msec.edu.in',
    password: 'secretary@123',
    role: 'secretary',
    name: 'Department Secretary',
    department: 'Administration'
  },
  {
    email: 'staff@msec.edu.in',
    password: 'staff@123',
    role: 'staff',
    name: 'Faculty Staff',
    department: 'Computer Science'
  }
]

async function seedUsers() {
  try {
    console.log('🔄 Connecting to database...')
    await connectToDatabase()
    console.log('✅ Connected to MongoDB')

    console.log('👥 Creating test users...')
    
    for (const userData of testUsers) {
      try {
        // Check if user already exists
        const existingUser = await User.findOne({ email: userData.email })
        
        if (existingUser) {
          console.log(`👤 User ${userData.email} already exists, updating password...`)
          const hashed = await bcrypt.hash(userData.password, 10)
          existingUser.password = hashed
          await existingUser.save()
        } else {
          console.log(`➕ Creating new user: ${userData.email}`)
          const hashed = await bcrypt.hash(userData.password, 10)
          const user = new User({ ...userData, password: hashed })
          await user.save()
        }
      } catch (error) {
        console.error(`❌ Error creating user ${userData.email}:`, error.message)
      }
    }

    console.log('✅ User seeding completed!')
    
    // Verify users
    const totalUsers = await User.countDocuments()
    console.log(`📊 Total users in database: ${totalUsers}`)
    
    const users = await User.find({}, 'email role name').lean()
    users.forEach(user => {
      console.log(`👤 ${user.role.toUpperCase()}: ${user.email} - ${user.name}`)
    })
    
  } catch (error) {
    console.error('❌ Database seeding failed:', error)
  } finally {
    process.exit(0)
  }
}

seedUsers()