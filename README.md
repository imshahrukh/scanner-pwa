# QR & Barcode Scanner PWA

A Progressive Web App (PWA) built with React and TypeScript that allows users to scan QR codes and barcodes using their device's camera. The app works offline and can be installed on mobile devices for a native app-like experience.

## Features

- 📱 **Camera-based scanning** using react-zxing library
- 🔄 **Real-time QR code and barcode detection**
- 💾 **Offline support** with service worker caching
- 📲 **Installable PWA** for mobile and desktop
- 🎨 **Modern UI** with Tailwind CSS
- 🔗 **Smart link detection** with clickable URLs
- 📋 **Copy to clipboard** functionality
- 📊 **Scan history** with local storage
- 🎯 **TypeScript** for type safety

## Tech Stack

- **Frontend**: React 19, TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Scanner**: react-zxing (ZXing library wrapper)
- **PWA**: vite-plugin-pwa with Workbox
- **Icons**: Heroicons (via SVG)

## Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Modern browser with camera support
- HTTPS for camera access (required in production)

### Installation

1. **Clone and setup**:
   ```bash
   cd my-scanner-pwa
   npm install
   ```

2. **Generate proper PWA icons** (replace placeholders):
   ```bash
   # Option 1: Use online tools
   # Visit https://realfavicongenerator.net/
   # Upload your icon and download the generated files
   
   # Option 2: Create manually
   # Create 192x192px and 512x512px PNG icons
   # Place them in public/ directory
   ```

3. **Development server**:
   ```bash
   npm run dev
   ```
   Access at `http://localhost:5173`

4. **Build for production**:
   ```bash
   npm run build
   ```

5. **Preview production build**:
   ```bash
   npm run preview
   ```

## Camera Permissions

The app requires camera access to scan codes. Ensure:

- **Development**: Use `http://localhost` (Chrome allows camera on localhost)
- **Production**: **HTTPS is required** for camera access
- Users must grant camera permissions when prompted

## PWA Installation

### Desktop (Chrome/Edge)
1. Visit the app URL
2. Click the install button in the address bar
3. Or use the in-app install prompt

### Mobile (iOS/Android)
1. Open in Safari (iOS) or Chrome (Android)
2. Tap "Add to Home Screen"
3. Or use the in-app install prompt

## Deployment Options

### Option 1: Vercel (Recommended)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
npm run build
vercel --prod
```

### Option 2: Netlify
```bash
# Build
npm run build

# Deploy dist/ folder to Netlify
# Or connect your GitHub repo for auto-deployment
```

### Option 3: GitHub Pages
```bash
# Install gh-pages
npm install --save-dev gh-pages

# Add to package.json scripts:
# "predeploy": "npm run build",
# "deploy": "gh-pages -d dist"

# Set base in vite.config.ts:
# base: '/your-repo-name/'

npm run deploy
```

### Option 4: Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 4173
CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0"]
```

## File Structure

```
my-scanner-pwa/
├── public/
│   ├── pwa-192x192.png      # PWA icon 192x192
│   ├── pwa-512x512.png      # PWA icon 512x512
│   ├── apple-touch-icon.png # Apple touch icon
│   └── mask-icon.svg        # Safari mask icon
├── src/
│   ├── components/
│   │   ├── Scanner.tsx      # Main scanner component
│   │   ├── ResultDisplay.tsx # Scan results display
│   │   └── InstallPrompt.tsx # PWA install prompt
│   ├── types/
│   │   └── index.ts         # TypeScript type definitions
│   ├── App.tsx              # Main app component
│   ├── main.tsx            # App entry point
│   └── index.css           # Tailwind CSS styles
├── scripts/
│   └── generate-icons.cjs   # Icon generation script
├── vite.config.ts          # Vite + PWA configuration
├── tailwind.config.js      # Tailwind CSS configuration
└── tsconfig.json           # TypeScript configuration
```

## Configuration

### PWA Settings (vite.config.ts)
- **Service Worker**: Auto-update strategy
- **Caching**: Static assets cached for offline use
- **Manifest**: App name, icons, theme colors
- **Scope**: Root path for PWA

### Tailwind CSS (tailwind.config.js)
- **Custom colors**: Primary blue theme
- **Responsive design**: Mobile-first approach
- **Custom components**: Button and scanner styles

## Browser Support

### Desktop
- ✅ Chrome 88+
- ✅ Firefox 85+
- ✅ Safari 14+
- ✅ Edge 88+

### Mobile
- ✅ iOS Safari 14+
- ✅ Chrome Mobile 88+
- ✅ Samsung Internet 14+

## Development

### Adding New Scan Formats
```typescript
// Modify Scanner.tsx useZxing configuration
constraints: {
  video: {
    facingMode: 'environment', // 'user' for front camera
    // Add more constraints as needed
  }
}
```

### Customizing Styles
```css
/* src/index.css */
@layer components {
  .your-custom-class {
    @apply bg-blue-500 text-white p-4;
  }
}
```

### TypeScript Types
```typescript
// src/types/index.ts
export interface CustomScanResult extends ScanResult {
  customField: string;
}
```

## Testing

### Lighthouse PWA Audit
1. Build and serve the app: `npm run build && npm run preview`
2. Open Chrome DevTools
3. Go to Lighthouse tab
4. Run PWA audit
5. Ensure score > 90

### Camera Testing
- Test on different devices (iOS/Android)
- Test different lighting conditions
- Test various code formats (QR, Data Matrix, Code 128, etc.)

### Offline Testing
1. Build and serve app
2. Open DevTools > Application > Service Workers
3. Check "Offline" checkbox
4. Refresh page - app should still work

## Troubleshooting

### Camera Not Working
- Check HTTPS requirement
- Verify browser permissions
- Test getUserMedia support: `navigator.mediaDevices?.getUserMedia`

### PWA Not Installing
- Verify HTTPS deployment
- Check manifest.json validity
- Ensure service worker registration
- Test with Lighthouse PWA audit

### Build Errors
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install

# Check TypeScript errors
npm run build
```

## Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature-name`
3. Commit changes: `git commit -am 'Add feature'`
4. Push to branch: `git push origin feature-name`
5. Submit pull request

## License

MIT License - feel free to use this project for personal or commercial purposes.

## Resources

- [React ZXing Documentation](https://github.com/Sec-ant/react-zxing)
- [Vite PWA Plugin](https://vite-pwa-org.netlify.app/)
- [PWA Best Practices](https://web.dev/progressive-web-apps/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
