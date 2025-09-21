// Quick test to check why FECHA button is still active
// Run this in browser console on the dashboard page

console.log('🔍 Testing FECHA button state...');

// Check if the API returns CREATED date
fetch('/api/game-dates/configured-or-active')
  .then(response => response.json())
  .then(data => {
    console.log('✅ API Response:', data);
    console.log('📊 Analysis:');
    console.log('  - Has date:', !!data);
    console.log('  - Status:', data?.status);
    console.log('  - isConfigured:', data?.isConfigured);
    console.log('  - Should disable FECHA button:', !!data);
  })
  .catch(error => {
    console.error('❌ API Error:', error);
  });

// Check React component state (if available)
if (window.React) {
  console.log('⚛️ React DevTools available');
} else {
  console.log('⚠️ React DevTools not available');
}

console.log('💡 If API returns CREATED date but button is still active:');
console.log('  1. Clear browser cache (Ctrl+Shift+R)');
console.log('  2. Check browser console for SWR debug logs');
console.log('  3. Look for "Force Refresh Data" button in debug section');