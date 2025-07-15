# Capacitor Setup Guide - Solving iOS PWA Camera Issues

## 🔧 The Problem
iOS PWAs lose camera access when added to the Home Screen (standalone mode). This is a known iOS limitation that affects all PWAs.

## 🚀 The Solution: Capacitor Native App

Capacitor allows you to wrap your PWA as a native iOS app, giving you full camera access while maintaining web technologies.

## 📋 Prerequisites

- macOS (required for iOS development)
- Xcode 14+ installed
- iOS Simulator or physical iOS device
- Apple Developer Account (for App Store distribution)

## 🛠️ Setup Instructions

### 1. Install Dependencies

```bash
# Install the new Capacitor dependencies
npm install

# Initialize Capacitor
npx cap init
```

### 2. Add iOS Platform

```bash
# Add iOS platform
npm run cap:add:ios
```

### 3. Build and Sync

```bash
# Build your web app and sync to native
npm run build:native
```

### 4. Open in Xcode

```bash
# Open the iOS project in Xcode
npm run cap:open:ios
```

### 5. Configure iOS Permissions

The camera permissions are already configured in `capacitor.config.ts`, but you may need to add custom permission descriptions in Xcode:

1. In Xcode, open `ios/App/App/Info.plist`
2. Add camera usage description:

```xml
<key>NSCameraUsageDescription</key>
<string>This app needs camera access to scan QR codes and barcodes</string>
```

## 🔄 Development Workflow

### For Web Development (PWA)
```bash
npm run dev  # Regular web development
```

### For Native Development
```bash
npm run build:native  # Build and sync to native
npm run cap:open:ios  # Open in Xcode to test/build
```

## 📱 Testing

### iOS Simulator
1. Run `npm run build:native`
2. Open Xcode via `npm run cap:open:ios`
3. Select an iOS simulator
4. Click the play button to build and run

### Physical Device
1. Connect your iOS device
2. In Xcode, select your device from the device list
3. Ensure your device is in Developer Mode
4. Build and run

## 🎯 Key Benefits

✅ **Full Camera Access**: Native camera API works in standalone mode
✅ **Same Codebase**: Keep your existing React/TypeScript code
✅ **App Store Ready**: Can be distributed through the App Store
✅ **Better Performance**: Native shell improves performance
✅ **Background Processing**: Access to native background capabilities

## 🚨 Important Notes

### Hybrid Strategy
Your app now supports both:
- **Web Version**: Works in Safari as a PWA
- **Native Version**: Full native features via Capacitor

The platform detection in `src/types/index.ts` automatically detects the environment and uses appropriate camera APIs.

### Camera Handling
- **Native Mode**: Uses `@capacitor/camera` for full camera access
- **Web Mode**: Falls back to WebRTC/react-zxing for PWA compatibility

### Development Considerations
- Test both web and native versions regularly
- Some Capacitor plugins may not work in web mode
- Use feature detection before calling native APIs

## 🏗️ Production Deployment

### App Store Submission
1. Archive your app in Xcode
2. Upload to App Store Connect
3. Follow Apple's review guidelines

### Web Deployment
Your existing PWA deployment continues to work unchanged.

## 🔍 Troubleshooting

### Common Issues

**Camera not working in simulator:**
- Use a physical device - camera doesn't work in iOS Simulator

**Build errors:**
- Ensure iOS deployment target is 13.0+
- Clean build folder in Xcode

**Permission denied:**
- Check `Info.plist` has camera usage description
- Verify user granted camera permission

### Getting Help
- [Capacitor Documentation](https://capacitorjs.com/docs)
- [iOS Camera Plugin](https://capacitorjs.com/docs/apis/camera)

## 📊 Expected Results

After implementing Capacitor:
- ✅ Camera works in iOS standalone/home screen mode
- ✅ Native app performance and capabilities
- ✅ App Store distribution ready
- ✅ Maintains PWA compatibility for web users 