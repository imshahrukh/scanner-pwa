import { useState, useEffect } from 'react';
import type { BeforeInstallPromptEvent } from '../types';
import { detectPlatform } from '../types';

const InstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [platformInfo, setPlatformInfo] = useState(detectPlatform());

  useEffect(() => {
    const platform = detectPlatform();
    setPlatformInfo(platform);

    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Save the event so it can be triggered later
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowInstallPrompt(true);
    };

    const handleAppInstalled = () => {
      setShowInstallPrompt(false);
      setDeferredPrompt(null);
    };

    // For non-iOS devices, use the standard beforeinstallprompt event
    if (!platform.isIOS) {
      window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.addEventListener('appinstalled', handleAppInstalled);
    }

    // For iOS, show install prompt if not already installed and not dismissed
    if (platform.canInstall) {
      const hasBeenDismissed = localStorage.getItem('ios-install-dismissed');
      if (!hasBeenDismissed) {
        setShowInstallPrompt(true);
      }
    }

    return () => {
      if (!platform.isIOS) {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.removeEventListener('appinstalled', handleAppInstalled);
      }
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // Show the install prompt
    await deferredPrompt.prompt();
    
    // Wait for the user to respond to the prompt
    const choiceResult = await deferredPrompt.userChoice;
    
    if (choiceResult.outcome === 'accepted') {
      console.log('User accepted the install prompt');
    } else {
      console.log('User dismissed the install prompt');
    }
    
    setDeferredPrompt(null);
    setShowInstallPrompt(false);
  };

  const handleShareClick = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'QR & Barcode Scanner',
          text: 'Install this QR Scanner app',
          url: window.location.href,
        });
      } catch (error) {
        console.log('Share canceled or failed:', error);
      }
    } else {
      // Fallback: just show alert with instructions
      alert('To install this app:\n1. Tap the Share button in Safari\n2. Select "Add to Home Screen"\n3. Tap "Add" to confirm');
    }
  };

  const handleDismiss = () => {
    setShowInstallPrompt(false);
    
    // For iOS, remember that user dismissed the prompt
    if (platformInfo.isIOS) {
      localStorage.setItem('ios-install-dismissed', 'true');
    }
  };

  // Don't show if already installed as PWA
  if (platformInfo.isStandalone || !showInstallPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 max-w-md mx-auto">
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-gray-900 mb-1">
              Install QR Scanner
            </h3>
            
            {platformInfo.isIOS ? (
              <>
                <p className="text-sm text-gray-600 mb-3">
                  Add this app to your home screen for quick access and offline use.
                </p>
                <div className="text-sm text-gray-600 mb-3">
                  <p className="mb-2">To install on iOS:</p>
                  <ol className="list-decimal list-inside space-y-1 text-xs">
                    <li>
                      Tap the Share button 
                      <button
                        onClick={handleShareClick}
                        className="inline-flex items-center mx-1 p-1 bg-primary-100 hover:bg-primary-200 rounded transition-colors"
                        title="Tap to open share menu"
                      >
                        <svg className="w-3 h-3 text-primary-600" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z"/>
                        </svg>
                      </button>
                      in Safari
                    </li>
                    <li>Select "Add to Home Screen"</li>
                    <li>Tap "Add" to confirm</li>
                  </ol>
                  <p className="text-xs text-gray-500 mt-2">
                    💡 Tip: Tap the blue share button above to open the share menu directly!
                  </p>
                </div>
              </>
            ) : (
              <p className="text-sm text-gray-600 mb-3">
                Add this app to your home screen for quick access and offline use.
              </p>
            )}
            
            <div className="flex gap-2">
              {!platformInfo.isIOS && deferredPrompt && (
                <button
                  onClick={handleInstallClick}
                  className="px-3 py-1.5 bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium rounded transition-colors"
                >
                  Install
                </button>
              )}
              <button
                onClick={handleDismiss}
                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded transition-colors"
              >
                {platformInfo.isIOS ? 'Got it' : 'Later'}
              </button>
            </div>
          </div>
          
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default InstallPrompt; 