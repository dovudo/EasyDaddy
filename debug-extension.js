// EasyDaddy Extension Debug Script
// Paste this into browser console to debug extension functionality

console.log('🔍 EasyDaddy Extension Debug Script Started');

// 1. Check if extension is loaded
function checkExtensionLoaded() {
    console.log('📦 Checking if extension is loaded...');
    
    // Check for content script
    if (typeof window.browserAPI !== 'undefined') {
        console.log('✅ Content script loaded:', window.browserAPI);
    } else {
        console.warn('❌ Content script not loaded');
    }
    
    // Check for Chrome API
    if (typeof chrome !== 'undefined' && chrome.runtime) {
        console.log('✅ Chrome API available');
        console.log('Extension ID:', chrome.runtime.id);
    } else {
        console.warn('❌ Chrome API not available');
    }
}

// 2. Check context menu registration
function checkContextMenu() {
    console.log('🖱️ Checking context menu...');
    
    // This won't work from content script, but can help identify issues
    console.log('Right-click on page to see if "EasyDaddy - Fill Forms" appears');
    
    // Check if background script is responding
    if (typeof chrome !== 'undefined' && chrome.runtime) {
        chrome.runtime.sendMessage({type: 'ping'}, (response) => {
            if (response) {
                console.log('✅ Background script responding:', response);
            } else {
                console.warn('❌ Background script not responding');
            }
        });
    }
}

// 3. Check form detection
function checkFormDetection() {
    console.log('📋 Checking form detection...');
    
    const forms = document.querySelectorAll('form');
    console.log(`Found ${forms.length} forms on page`);
    
    const inputs = document.querySelectorAll('input, select, textarea');
    console.log(`Found ${inputs.length} form fields`);
    
    inputs.forEach((input, index) => {
        console.log(`Field ${index + 1}:`, {
            type: input.type || input.tagName,
            name: input.name,
            id: input.id,
            placeholder: input.placeholder
        });
    });
}

// 4. Test keyboard shortcuts
function testKeyboardShortcuts() {
    console.log('⌨️ Testing keyboard shortcuts...');
    console.log('Try pressing Alt+Shift+F to fill forms');
    console.log('Try pressing Alt+Shift+E to open popup');
    
    // Add event listener to detect shortcuts
    document.addEventListener('keydown', function(e) {
        if (e.altKey && e.shiftKey && e.key === 'F') {
            console.log('🔥 Alt+Shift+F detected - should trigger form fill');
        }
        if (e.altKey && e.shiftKey && e.key === 'E') {
            console.log('🔥 Alt+Shift+E detected - should open popup');
        }
    });
}

// 5. Test context menu simulation
function simulateContextMenu() {
    console.log('🎯 Simulating context menu...');
    
    // This is a simulation - actual context menu is handled by browser
    document.addEventListener('contextmenu', function(e) {
        console.log('Right-click detected at:', e.clientX, e.clientY);
        console.log('Look for "EasyDaddy - Fill Forms" in context menu');
    });
}

// 6. Check extension permissions
function checkPermissions() {
    console.log('🔐 Checking extension permissions...');
    
    if (typeof chrome !== 'undefined' && chrome.permissions) {
        chrome.permissions.getAll((permissions) => {
            console.log('Extension permissions:', permissions);
        });
    } else {
        console.warn('❌ Cannot check permissions');
    }
}

// 7. Test extension messaging
function testMessaging() {
    console.log('📡 Testing extension messaging...');
    
    if (typeof chrome !== 'undefined' && chrome.runtime) {
        // Test ping to background
        chrome.runtime.sendMessage({type: 'ping'}, (response) => {
            console.log('Background ping response:', response);
        });
        
        // Test tab messaging
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, {type: 'ping'}, (response) => {
                    console.log('Content script ping response:', response);
                });
            }
        });
    }
}

// Run all checks
function runAllChecks() {
    console.log('🚀 Running all extension checks...');
    
    checkExtensionLoaded();
    checkContextMenu();
    checkFormDetection();
    testKeyboardShortcuts();
    simulateContextMenu();
    checkPermissions();
    testMessaging();
    
    console.log('✅ All checks completed. Check console for results.');
}

// Auto-run on script load
runAllChecks();

// Make functions available globally for manual testing
window.EasyDaddyDebug = {
    checkExtensionLoaded,
    checkContextMenu,
    checkFormDetection,
    testKeyboardShortcuts,
    simulateContextMenu,
    checkPermissions,
    testMessaging,
    runAllChecks
};

console.log('🔧 Debug functions available under window.EasyDaddyDebug');
console.log('Example: EasyDaddyDebug.runAllChecks()'); 