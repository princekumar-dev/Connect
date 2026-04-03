import webpush from 'web-push'

console.log('\n🔑 Generating VAPID Keys for Push Notifications...\n')

const vapidKeys = webpush.generateVAPIDKeys()

console.log('✅ VAPID Keys Generated Successfully!\n')
console.log('📋 Copy these keys to your .env file:\n')
console.log('VAPID_PUBLIC_KEY=' + vapidKeys.publicKey)
console.log('VAPID_PRIVATE_KEY=' + vapidKeys.privateKey)
console.log('\n⚠️  IMPORTANT:')
console.log('1. Add these to your .env file')
console.log('2. Update src/utils/notifications.js line 65 with the PUBLIC key')
console.log('3. Keep the PRIVATE key secret - never commit it to git')
console.log('4. Restart your server after updating .env')
console.log('\n✨ Done! Check PUSH_NOTIFICATIONS_GUIDE.md for full setup instructions.\n')
