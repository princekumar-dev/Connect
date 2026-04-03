import dotenv from 'dotenv'
import webpush from 'web-push'
import { connectToDatabase } from '../lib/mongo.js'
import { sendBookingNotification } from '../lib/notificationQueue.js'
import { getAllActiveSubscriptions, storeNotification } from '../lib/notificationService.js'

dotenv.config()

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || 'BI3ZQwdtuxxYpepMvZjy5xkuzLbnsjG8J1jfBkGMi0AzbhWDocIASZkq6ocisfwCTnYCHuogo_O-PJSuyfGWwkU'
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || 'hfn59n2ZF4qdGGl1kiuZ_zglStMTBIqN0CxC49jXUMc'

webpush.setVapidDetails('mailto:support@msecconnect.edu', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)

function fmt(date) { return new Date(date).toISOString() }

async function seedDemoData(db) {
	const bookings = db.collection('bookings')
	const events = db.collection('events')

	const today = new Date()
	today.setHours(12,0,0,0)
	const tomorrow = new Date(today.getTime() + 24*60*60*1000)

	// Create demo bookings for staff and hod
	const staffBooking = {
		bookingId: 'BK-STAFF-' + Date.now() + '-' + Math.random().toString(36).slice(2,7).toUpperCase(),
		venue: 'Main Hall',
		date: today,
		time: '12:00 PM',
		duration: 2,
		attendees: 50,
		organizer: 'Staff Organizer',
		email: 'staff@msec.edu.in',
		purpose: 'Demo Booking - Staff',
		purposeCategory: 'Events',
		status: 'pending',
		userRole: 'staff',
		createdAt: new Date(),
		updatedAt: new Date()
	}
	const hodBooking = {
		bookingId: 'BK-HOD-' + Date.now() + '-' + Math.random().toString(36).slice(2,7).toUpperCase(),
		venue: 'Auditorium',
		date: tomorrow,
		time: '03:00 PM',
		duration: 1,
		attendees: 100,
		organizer: 'HOD Organizer',
		email: 'hod@msec.edu.in',
		purpose: 'Demo Booking - HOD',
		purposeCategory: 'Events',
		status: 'pending',
		userRole: 'hod',
		createdAt: new Date(),
		updatedAt: new Date()
	}

	const staffInsert = await bookings.insertOne(staffBooking)
	const hodInsert = await bookings.insertOne(hodBooking)
	staffBooking._id = staffInsert.insertedId
	hodBooking._id = hodInsert.insertedId

	// Create demo events
	const demoTodayEvent = {
		title: 'Test Event - Today (All Users)',
		description: 'Demo event for today',
		date: today,
		time: '05:00 PM',
		venue: 'Seminar Hall',
		eventType: 'Events',
		image: '',
		createdBy: 'admin@msec.edu.in',
		createdAt: new Date()
	}
	const demoTomorrowEvent = {
		title: 'Test Event - Tomorrow (All Users)',
		description: 'Demo event for tomorrow',
		date: tomorrow,
		time: '10:00 AM',
		venue: 'Conference Room',
		eventType: 'Events',
		image: '',
		createdBy: 'admin@msec.edu.in',
		createdAt: new Date()
	}
	await events.insertMany([demoTodayEvent, demoTomorrowEvent])

	return { staffBooking, hodBooking, demoTodayEvent, demoTomorrowEvent }
}

async function sendEventBroadcast(title, body, url = '/', eventId = null) {
	const { subscriptions } = await getAllActiveSubscriptions()
	const activeSubs = (subscriptions || []).filter(s => s.active === true || s.status === 'active')
	if (activeSubs.length === 0) {
		console.log('ℹ️ No active subscriptions to broadcast')
		return { sent: 0 }
	}
	
	// Create unique tag for each event notification
	const uniqueTag = eventId ? `event-${eventId}-${Date.now()}` : `event-broadcast-${Date.now()}-${Math.random().toString(36).slice(2,7)}`
	const payload = JSON.stringify({ 
		title, 
		body, 
		icon: '/images/android-chrome-192x192.png', 
		badge: '/images/favicon-32x32.png', 
		tag: uniqueTag, 
		data: { url, eventId } 
	})
	
	let success = 0
	for (const sub of activeSubs) {
		try {
			await webpush.sendNotification(sub.subscription, payload)
			success++
			await storeNotification({ userEmail: sub.userEmail, title, body, url, broadcast: true, eventId })
		} catch (e) {
			console.log(`❌ Broadcast failed for ${sub.userEmail}: ${e.message}`)
		}
	}
	console.log(`📢 Broadcast delivered: ${success}/${activeSubs.length} (tag: ${uniqueTag})`)
	return { sent: success }
}

async function sendAdminNotification(title, body, url = '/admin/bookings') {
	const { subscriptions } = await getAllActiveSubscriptions()
	const adminSubs = (subscriptions || []).filter(s => s.userEmail === 'admin@msec.edu.in' && (s.active === true || s.status === 'active'))
	if (adminSubs.length === 0) {
		console.log('ℹ️ No active admin subscriptions for admin notifications')
		return { sent: 0 }
	}
	
	const uniqueTag = `admin-${Date.now()}-${Math.random().toString(36).slice(2,7)}`
	const payload = JSON.stringify({ 
		title, 
		body, 
		icon: '/images/android-chrome-192x192.png', 
		badge: '/images/favicon-32x32.png', 
		tag: uniqueTag, 
		vibrate: [200, 100, 200],
		requireInteraction: true,
		silent: false,
		renotify: true,
		data: { url, notificationId: uniqueTag } 
	})
	
	let success = 0
	for (const sub of adminSubs) {
		try {
			await webpush.sendNotification(sub.subscription, payload)
			success++
			await storeNotification({ userEmail: sub.userEmail, title, body, url, adminNotification: true })
		} catch (e) {
			console.log(`❌ Admin notification failed for ${sub.userEmail}: ${e.message}`)
		}
	}
	console.log(`📢 Admin notification delivered: ${success}/${adminSubs.length} (tag: ${uniqueTag})`)
	return { sent: success }
}

async function main() {
	console.log('\n🧪 Running COMPREHENSIVE NOTIFICATION TEST...')
	const mongoose = await connectToDatabase()
	const db = mongoose.connection.db

	const users = await db.collection('users').find({}).toArray()
	console.log('👥 Users:', users.map(u => `${u.email}(${u.role})`).join(', '))

	const seeded = await seedDemoData(db)
	console.log('🌱 Seeded demo data:', {
		staffBooking: seeded.staffBooking._id?.toString(),
		hodBooking: seeded.hodBooking._id?.toString(),
		today: fmt(seeded.demoTodayEvent.date),
		tomorrow: fmt(seeded.demoTomorrowEvent.date)
	})

	// Test booking notifications for all users (except admin)
	console.log('\n📦 Booking notifications for all users (except admin):')
	
	// Staff booking notifications
	console.log('\n👤 Staff notifications:')
	await sendBookingNotification(seeded.staffBooking, 'created')
	await sendBookingNotification({ ...seeded.staffBooking, status: 'approved' }, 'approved')
	await sendBookingNotification({ ...seeded.staffBooking, venue: 'Mini Hall' }, 'reassigned', { originalVenue: 'Main Hall' })
	await sendBookingNotification(seeded.staffBooking, 'cancelled', { reason: 'Demo cancellation' })

	// HOD booking notifications
	console.log('\n👤 HOD notifications:')
	await sendBookingNotification(seeded.hodBooking, 'created')
	await sendBookingNotification(seeded.hodBooking, 'rejected')
	await sendBookingNotification(seeded.hodBooking, 'deleted')

	// Principal booking notifications
	console.log('\n👤 Principal notifications:')
	const principalBooking = {
		bookingId: 'BK-PRINCIPAL-' + Date.now() + '-' + Math.random().toString(36).slice(2,7).toUpperCase(),
		venue: 'Conference Room',
		date: new Date(Date.now() + 2*24*60*60*1000), // 2 days from now
		time: '02:00 PM',
		duration: 3,
		attendees: 25,
		organizer: 'Principal Office',
		email: 'principal@msec.edu.in',
		purpose: 'Demo Principal Meeting',
		purposeCategory: 'Administrative',
		status: 'pending',
		userRole: 'principal',
		createdAt: new Date(),
		updatedAt: new Date()
	}
	const principalInsert = await db.collection('bookings').insertOne(principalBooking)
	principalBooking._id = principalInsert.insertedId
	await sendBookingNotification(principalBooking, 'created')
	await sendBookingNotification({ ...principalBooking, status: 'approved' }, 'approved')

	// Secretary booking notifications
	console.log('\n👤 Secretary notifications:')
	const secretaryBooking = {
		bookingId: 'BK-SECRETARY-' + Date.now() + '-' + Math.random().toString(36).slice(2,7).toUpperCase(),
		venue: 'Meeting Room',
		date: new Date(Date.now() + 3*24*60*60*1000), // 3 days from now
		time: '10:00 AM',
		duration: 1,
		attendees: 15,
		organizer: 'Secretary Office',
		email: 'secretary@msec.edu.in',
		purpose: 'Demo Secretary Meeting',
		purposeCategory: 'Administrative',
		status: 'pending',
		userRole: 'secretary',
		createdAt: new Date(),
		updatedAt: new Date()
	}
	const secretaryInsert = await db.collection('bookings').insertOne(secretaryBooking)
	secretaryBooking._id = secretaryInsert.insertedId
	await sendBookingNotification(secretaryBooking, 'created')
	await sendBookingNotification(secretaryBooking, 'rejected')

	// Admin notifications about user bookings
	console.log('\n👑 Admin notifications about user bookings:')
	await sendAdminNotification(
		'📋 New Booking Request', 
		`Staff: ${seeded.staffBooking.venue} on ${new Date(seeded.staffBooking.date).toLocaleDateString()} at ${seeded.staffBooking.time} - PENDING`
	)
	await sendAdminNotification(
		'✅ Booking Approved', 
		`Staff: ${seeded.staffBooking.venue} on ${new Date(seeded.staffBooking.date).toLocaleDateString()} at ${seeded.staffBooking.time} - APPROVED`
	)
	await sendAdminNotification(
		'❌ Booking Rejected', 
		`HOD: ${seeded.hodBooking.venue} on ${new Date(seeded.hodBooking.date).toLocaleDateString()} at ${seeded.hodBooking.time} - REJECTED`
	)
	await sendAdminNotification(
		'🔄 Venue Reassigned', 
		`Staff: ${seeded.staffBooking.venue} (was Main Hall) on ${new Date(seeded.staffBooking.date).toLocaleDateString()} at ${seeded.staffBooking.time} - REASSIGNED`
	)
	await sendAdminNotification(
		'🚫 Booking Cancelled', 
		`Staff: ${seeded.staffBooking.venue} on ${new Date(seeded.staffBooking.date).toLocaleDateString()} at ${seeded.staffBooking.time} - CANCELLED`
	)
	await sendAdminNotification(
		'📋 New Booking Request', 
		`Principal: ${principalBooking.venue} on ${new Date(principalBooking.date).toLocaleDateString()} at ${principalBooking.time} - PENDING`
	)
	await sendAdminNotification(
		'✅ Booking Approved', 
		`Principal: ${principalBooking.venue} on ${new Date(principalBooking.date).toLocaleDateString()} at ${principalBooking.time} - APPROVED`
	)
	await sendAdminNotification(
		'❌ Booking Rejected', 
		`Secretary: ${secretaryBooking.venue} on ${new Date(secretaryBooking.date).toLocaleDateString()} at ${secretaryBooking.time} - REJECTED`
	)

	// Event notifications (broadcast to all active)
	console.log('\n📅 Event notifications (today & tomorrow)')
	await sendEventBroadcast('🎉 Today: ' + seeded.demoTodayEvent.title, 'An event is happening today. Tap to view.', '/', seeded.demoTodayEvent._id?.toString())
	await sendEventBroadcast('🔔 Tomorrow: ' + seeded.demoTomorrowEvent.title, 'Reminder for tomorrow\'s event. Tap to view.', '/', seeded.demoTomorrowEvent._id?.toString())

	console.log('\n✅ COMPREHENSIVE NOTIFICATION TEST completed.')
	await mongoose.connection.close()
}

main().catch(err => { console.error('❌ Test failed:', err); process.exit(1) })
