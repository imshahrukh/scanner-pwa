# 🚀 Multi-QR Scanner PWA

A cutting-edge Progressive Web App (PWA) for scanning multiple QR codes simultaneously in real-time using advanced computer vision techniques.

## ✨ Features

### 🔥 Advanced Multi-Code Detection
- **Real-time scanning** of multiple QR codes in a single camera frame
- **Region-based detection** - scans different areas of the image simultaneously
- **Multi-scale detection** - detects codes of various sizes and orientations
- **Duplicate filtering** - automatically removes duplicate codes
- **High accuracy** - uses advanced jsQR library with confidence scoring

### 📱 PWA Features
- **Offline functionality** - works without internet connection
- **Installable** - can be installed on any device like a native app
- **Responsive design** - optimized for mobile, tablet, and desktop
- **Fast loading** - optimized bundle with code splitting
- **Service worker** - intelligent caching for performance

### 🎨 Modern UI/UX
- **Beautiful animations** - smooth transitions with Framer Motion
- **Real-time stats** - live FPS, processing time, and detection metrics
- **Dark/light theme** - adaptive design with glass morphism effects
- **Touch optimized** - perfect for mobile devices
- **Accessibility** - WCAG compliant design

### 📊 Advanced Analytics
- **Live statistics** - FPS, frames processed, codes detected
- **Processing metrics** - average processing time and performance
- **Export functionality** - JSON export of all scan results
- **Session management** - persistent storage with localStorage

## 🛠️ Technology Stack

- **Frontend**: React 19 + TypeScript
- **Styling**: Tailwind CSS + Framer Motion
- **QR Detection**: jsQR + Custom Multi-QR Detector
- **PWA**: Workbox + Vite PWA Plugin
- **Icons**: Lucide React
- **Build Tool**: Vite

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd scanner-pwa
```

2. **Install dependencies**
```bash
npm install
```

3. **Start development server**
```bash
npm run dev
```

4. **Open in browser**
Navigate to `https://localhost:5173` (HTTPS required for camera access)

### Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory, ready for deployment.

## 📱 PWA Installation

### Desktop
1. Open the app in Chrome/Edge
2. Click the install icon in the address bar
3. Follow the prompts to install

### Mobile (Android)
1. Open the app in Chrome
2. Tap the menu (⋮) and select "Add to Home screen"
3. Follow the prompts to install

### Mobile (iOS)
1. Open the app in Safari
2. Tap the share button (□↑)
3. Select "Add to Home Screen"
4. Follow the prompts to install

## 🔧 Advanced Configuration

### Scanner Settings
The scanner can be configured with various parameters:

```typescript
const config = {
  enableMultiScan: true,
  scanInterval: 100, // 10 FPS
  confidenceThreshold: 0.3,
  maxCodesPerFrame: 10,
  enableDuplicateDetection: true,
  enableRealTimeProcessing: true,
  cameraResolution: 'high',
  scanMode: 'continuous'
};
```

### Performance Optimization
- **Frame skipping** - processes every 3rd frame for better performance
- **Region scanning** - divides image into quadrants for parallel processing
- **Scale detection** - scans at multiple scales for different code sizes
- **Memory management** - limits stored results to prevent memory issues

## 🏗️ Architecture

### Core Components

1. **AdvancedMultiScanner** - Main scanner component with real-time processing
2. **MultiQRDetector** - Advanced detection service with region and scale scanning
3. **App** - Main application with PWA features and state management

### Detection Algorithm

1. **Full Image Scan** - Primary detection on entire frame
2. **Region Scanning** - Divides image into 5 regions (4 quadrants + center)
3. **Multi-Scale Detection** - Scans at 5 different scales (0.5x to 1.5x)
4. **Duplicate Removal** - Filters based on content and position
5. **Confidence Scoring** - Ranks results by detection confidence

### PWA Features

- **Service Worker** - Handles caching and offline functionality
- **Manifest** - Defines app appearance and behavior
- **Install Prompt** - Automatic installation suggestions
- **Offline Support** - Works without internet connection

## 📊 Performance Metrics

The app provides real-time performance metrics:

- **FPS** - Frames per second processing rate
- **Frames Processed** - Total frames analyzed
- **Codes Detected** - Total unique codes found
- **Average Processing Time** - Mean time per frame
- **Detection Confidence** - Accuracy of each detection

## 🎯 Use Cases

### Inventory Management
- Scan multiple product codes simultaneously
- Batch processing for large inventories
- Export results for database integration

### Event Management
- Quick check-in for multiple attendees
- Scan multiple tickets at once
- Real-time attendance tracking

### Quality Control
- Inspect multiple codes on packaging
- Verify product authenticity
- Batch verification processes

### Educational
- Classroom QR code activities
- Multiple answer scanning
- Interactive learning experiences

## 🔒 Security & Privacy

- **Local processing** - All scanning happens locally, no data sent to servers
- **Camera permissions** - Only requests camera access when needed
- **No tracking** - No analytics or user tracking
- **Offline first** - Works completely offline

## 🐛 Troubleshooting

### Camera Not Working
1. Ensure HTTPS is enabled (required for camera access)
2. Check browser permissions for camera access
3. Try refreshing the page
4. Test on a different browser

### Poor Detection
1. Ensure good lighting conditions
2. Hold device steady
3. Ensure QR codes are clearly visible
4. Try adjusting distance from codes

### Performance Issues
1. Close other browser tabs
2. Restart the browser
3. Check device memory usage
4. Try on a different device

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- **jsQR** - Excellent QR code detection library
- **Framer Motion** - Beautiful animations
- **Tailwind CSS** - Utility-first CSS framework
- **Vite** - Fast build tool
- **Workbox** - PWA service worker library

## 📞 Support

For support, please open an issue on GitHub or contact the development team.

---

**Built with ❤️ using React, TypeScript, and modern web technologies**
