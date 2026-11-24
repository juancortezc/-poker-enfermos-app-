#!/usr/bin/env npx tsx

/**
 * Generate VAPID keys for Web Push notifications
 * Run this script to generate the required VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY
 * for your .env.local file
 */

import webpush from 'web-push'

console.log('🔑 Generating VAPID keys for Web Push notifications...\n')

const vapidKeys = webpush.generateVAPIDKeys()

console.log('✅ VAPID keys generated successfully!\n')
console.log('Add these to your .env.local file:\n')
console.log('VAPID_PUBLIC_KEY=' + vapidKeys.publicKey)
console.log('VAPID_PRIVATE_KEY=' + vapidKeys.privateKey)
console.log('\n📝 Make sure to keep these keys secure and never commit them to version control!')
console.log('🔒 The private key should never be exposed to the client-side code.')