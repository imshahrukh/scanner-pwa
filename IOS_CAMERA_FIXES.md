# 🚨 iOS Camera Black Screen - Complete Fix Guide

## The Problem
You're seeing a black screen instead of camera feed on iPhone. This is a common iOS issue with several possible causes.

## 🔧 Solution 1: Enable HTTPS (Most Important)

iOS requires HTTPS for camera access. Fix the vite.config.ts:

```typescript
// vite.config.ts
export default defineConfig({
  plugins: [
    // ... your existing plugins
  ],
  server: {
    // Remove the problematic https: true line and add proper config
  }
})
```

**Alternative HTTPS setup:**
```bash
# Install local SSL certificate
npm install --save-dev @vitejs/plugin-basic-ssl

# Then in vite.config.ts add:
import basicSsl from '@vitejs/plugin-basic-ssl'

export default defineConfig({
  plugins: [
    react(),
    basicSsl(), // Add this for HTTPS
    VitePWA({...})
  ]
})
```

## 🔧 Solution 2: Test on Different Networks

```bash
# Start dev server
npm run dev

# Access via HTTPS:
# If on same WiFi: https://YOUR_COMPUTER_IP:5173
# If localhost: https://localhost:5173
```

## 🔧 Solution 3: Improved Camera Constraints

Update your Scanner component with more iOS-friendly constraints:

```typescript
// In src/components/Scanner.tsx
const getVideoConstraints = () => {
  if (platformInfo.isIOS) {
    return {
      facingMode: 'environment',
      width: { exact: 640 },
      height: { exact: 480 }
      // Remove frameRate constraints for iOS
    };
  }
  // ... rest of code
};
```

## 🔧 Solution 4: Camera Permission Check

Add explicit permission checking:

```typescript
// Before starting camera
const checkCameraPermission = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ 
      video: { facingMode: 'environment' } 
    });
    stream.getTracks().forEach(track => track.stop());
    return true;
  } catch (error) {
    console.error('Camera permission:', error);
    return false;
  }
};
```

## 🔧 Solution 5: iOS Safari Settings

**User must check these settings:**

1. **Safari Settings:**
   - Settings → Safari → Camera → Allow

2. **Website Permissions:**
   - Safari → Website Settings → Camera → Allow

3. **Privacy Settings:**
   - Settings → Privacy & Security → Camera → Safari (ON)

## 🔧 Solution 6: Deploy to Test Server

Sometimes localhost issues prevent camera access:

```bash
# Option 1: Use ngrok for HTTPS tunnel
npm install -g ngrok
npm run dev
# In another terminal:
ngrok http 5173

# Option 2: Deploy to Vercel/Netlify for testing
npm run build
# Deploy dist/ folder
```

## 🔧 Solution 7: Capacitor Native Testing

Since you have Capacitor setup, test the native version:

```bash
# Build native app and test camera there
npm run build
npx cap sync ios
npx cap open ios
# Test on physical iPhone via Xcode
```

## 🚨 Quick Debugging Steps

**Step 1: Check Browser Console**
- Open Safari Developer Tools
- Look for camera-related errors
- Check Network tab for HTTPS issues

**Step 2: Test Different URLs**
- Try: `https://localhost:5173`
- Try: `https://YOUR_IP:5173`
- Try deployed version

**Step 3: Test Other Camera Apps**
- Ensure device camera works in other apps
- Close all other camera-using apps

**Step 4: Restart Everything**
- Restart Safari
- Restart iPhone
- Clear Safari cache

## ✅ Success Indicators

Camera working correctly shows:
- Live video feed (not black screen)
- QR code detection overlay
- No permission errors in console

## 🎯 Most Likely Fix

**99% of iOS camera issues are HTTPS-related.** Try these in order:

1. **Add `@vitejs/plugin-basic-ssl`** to vite.config.ts
2. **Access via `https://localhost:5173`**
3. **Allow camera permissions in Safari**
4. **Test on deployed HTTPS site**

After fixing HTTPS, your camera should work perfectly! 🚀 