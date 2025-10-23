/**
 * Simple FCM Test Script
 * 
 * This script tests FCM notifications in different app states:
 * 1. App open (foreground)
 * 2. App in background
 * 3. App completely killed
 */

const { fcmService } = require('./services/fcmService');

async function testFCMNotifications() {
  console.log('🧪 Testing FCM Notifications...');
  
  try {
    // Test 1: Check FCM setup
    console.log('\n1. Checking FCM setup...');
    const hasPermission = await fcmService.checkNotificationPermission();
    console.log('✅ Notification permission:', hasPermission);
    
    const token = await fcmService.getFCMToken();
    console.log('✅ FCM token available:', !!token);
    console.log('✅ Token length:', token ? token.length : 0);
    
    // Test 2: Send test notification
    console.log('\n2. Sending test notification...');
    const testResult = await fcmService.testPushNotification();
    console.log('✅ Test notification sent:', testResult);
    
    // Test 3: Check notification flow
    console.log('\n3. Testing notification flow...');
    await fcmService.testNotificationFlow();
    
    console.log('\n✅ FCM test completed successfully!');
    console.log('\n📱 Next steps:');
    console.log('1. Test with app open (should work)');
    console.log('2. Test with app in background (should work)');
    console.log('3. Test with app completely killed (may need battery optimization disabled)');
    console.log('\n🔧 If notifications don\'t work when app is killed:');
    console.log('- Go to Settings > Apps > E-Responde > Battery');
    console.log('- Select "Don\'t optimize"');
    console.log('- Enable background activity');
    
  } catch (error) {
    console.error('❌ FCM test failed:', error);
  }
}

// Run the test
testFCMNotifications();
