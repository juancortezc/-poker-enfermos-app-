// Paste this script in browser console on the Dashboard page
// to check real-time button state

console.log('🔍 DEBUGGING FECHA BUTTON STATE');

// Test 1: Check API directly
fetch('/api/game-dates/configured-or-active')
  .then(response => response.json())
  .then(data => {
    console.log('✅ API Response:', data);
    console.log('   Should disable button:', !!data);
  })
  .catch(error => console.error('❌ API Error:', error));

// Test 2: Check button element
setTimeout(() => {
  const fechaButtons = document.querySelectorAll('[class*="admin-card"]');
  
  fechaButtons.forEach((card, index) => {
    const text = card.textContent;
    if (text && text.includes('FECHA')) {
      console.log(`🎯 FECHA Button Found (${index}):`);
      console.log('   Text:', text);
      console.log('   Classes:', card.className);
      console.log('   Opacity classes:', card.className.includes('opacity-60') ? 'HAS opacity-60' : 'MISSING opacity-60');
      
      // Check icon
      const icon = card.querySelector('.w-14.h-14');
      if (icon) {
        console.log('   Icon background:', icon.className);
        console.log('   Should be gray:', icon.className.includes('bg-gray-700') ? 'YES' : 'NO - Still red');
      }
      
      // Check if wrapped in Link or div
      const parent = card.parentElement;
      console.log('   Parent element:', parent.tagName);
      console.log('   Is clickable:', parent.tagName === 'A' ? 'YES (Link)' : 'NO (Div)');
      
      // Try to click and see what happens
      const currentUrl = window.location.href;
      card.addEventListener('click', (e) => {
        console.log('🖱️ Button clicked!');
        setTimeout(() => {
          if (window.location.href !== currentUrl) {
            console.log('❌ Navigation occurred - button is NOT disabled');
          } else {
            console.log('✅ No navigation - button is properly disabled');
          }
        }, 100);
      });
    }
  });
  
  console.log('💡 Click the FECHA button to test if navigation is blocked');
}, 1000);

// Test 3: Check React component state (if React DevTools available)
setTimeout(() => {
  if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
    console.log('⚛️ React DevTools detected - you can inspect component state');
  } else {
    console.log('📱 React DevTools not available');
  }
}, 1500);