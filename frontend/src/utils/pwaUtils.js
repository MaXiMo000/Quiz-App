/**
 * PWA Installation and Management Utilities
 * Provides functions for PWA installation prompts and app management
 */

class PWAManager {
  constructor() {
    this.installPrompt = null;
    this.isInstalled = false;
    this.isInstallable = false;
    this.setupEventListeners();
  }

  setupEventListeners() {
    console.log('🔧 Setting up PWA event listeners...');
    
    // Listen for beforeinstallprompt event
    window.addEventListener('beforeinstallprompt', (e) => {
      console.log('🎯 beforeinstallprompt event fired');
      e.preventDefault();
      this.installPrompt = e;
      this.isInstallable = true;
      console.log('📱 PWA install prompt captured and ready');
      
      // Dispatch custom event to notify components
      window.dispatchEvent(new CustomEvent('pwa-installable', { 
        detail: { canInstall: true } 
      }));
    });

    // Listen for app installed event
    window.addEventListener('appinstalled', () => {
      console.log('🎉 Quiz App PWA installed successfully!');
      this.isInstalled = true;
      this.isInstallable = false;
      this.installPrompt = null;
      this.trackInstallation();
      
      // Dispatch custom event to notify components
      window.dispatchEvent(new CustomEvent('pwa-installed', { 
        detail: { isInstalled: true } 
      }));
    });

    // Enhanced standalone mode detection
    const checkStandaloneMode = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                          window.navigator.standalone === true ||
                          document.referrer.includes('android-app://');
      
      if (isStandalone) {
        this.isInstalled = true;
        console.log('📱 PWA is running in standalone mode');
      }
      return isStandalone;
    };

    checkStandaloneMode();

    // Listen for display mode changes
    window.matchMedia('(display-mode: standalone)').addEventListener('change', (e) => {
      if (e.matches) {
        this.isInstalled = true;
        console.log('📱 PWA switched to standalone mode');
        window.dispatchEvent(new CustomEvent('pwa-installed', { 
          detail: { isInstalled: true } 
        }));
      }
    });

    // Listen for PWA readiness from service worker
    window.addEventListener('pwa-ready', () => {
      console.log('🚀 PWA is ready, checking installability...');
      setTimeout(() => this.checkInstallability(), 1000);
    });

    // Listen for manual installability check
    window.addEventListener('pwa-check-installability', () => {
      console.log('🔍 Manual PWA installability check triggered');
      this.checkInstallability();
    });

    // Check for delayed installability (some browsers delay the event)
    setTimeout(() => {
      if (!this.isInstallable && !this.isInstalled) {
        console.log('🔍 Checking delayed installability...');
        this.checkInstallability();
      }
    }, 5000);

    // Periodic installability check for development
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      setInterval(() => {
        if (!this.isInstallable && !this.isInstalled) {
          this.checkInstallability();
        }
      }, 10000); // Check every 10 seconds in development
    }
  }

  // Add method to check installability manually
  checkInstallability() {
    console.log('🔍 Checking PWA installability criteria...');
    
    const criteria = {
      hasServiceWorker: 'serviceWorker' in navigator,
      hasManifest: false,
      isSecure: location.protocol === 'https:' || location.hostname === 'localhost',
      hasIcons: false,
      isStandalone: window.matchMedia('(display-mode: standalone)').matches
    };

    // Check for manifest
    const manifestLink = document.querySelector('link[rel="manifest"]');
    if (manifestLink) {
      criteria.hasManifest = true;
      
      // Try to fetch and validate manifest
      fetch(manifestLink.href)
        .then(response => response.json())
        .then(manifest => {
          criteria.hasIcons = manifest.icons && manifest.icons.length > 0;
          console.log('📋 PWA Installability Criteria:', criteria);
          
          const meetsCriteria = criteria.hasServiceWorker && criteria.hasManifest && 
                               criteria.isSecure && criteria.hasIcons && !criteria.isStandalone;
          
          if (meetsCriteria) {
            console.log('✅ PWA meets all installability criteria');
            // Update the installable state even without beforeinstallprompt
            if (!this.isInstallable && !this.isInstalled) {
              this.isInstallable = true;
              // Dispatch event to update UI
              window.dispatchEvent(new CustomEvent('pwa-installable', { 
                detail: { canInstall: true } 
              }));
            }
          } else {
            console.log('❌ PWA missing some installability criteria:', 
              Object.keys(criteria).filter(key => !criteria[key]));
          }
        })
        .catch(error => {
          console.error('❌ Failed to validate manifest:', error);
        });
    }

    return criteria;
  }

  showInstallBanner() {
    const banner = document.createElement('div');
    banner.id = 'pwa-install-banner';
    banner.className = 'pwa-install-banner';
    banner.innerHTML = `
      <div class="banner-content">
        <span class="banner-text">📱 Install Quiz App for better experience!</span>
        <button class="install-btn" id="pwa-install-btn">Install</button>
        <button class="close-btn" id="pwa-close-btn">×</button>
      </div>
    `;

    // Add styles
    banner.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 12px;
      z-index: 10000;
      box-shadow: 0 2px 10px rgba(0,0,0,0.2);
      transform: translateY(-100%);
      transition: transform 0.3s ease;
    `;

    document.body.prepend(banner);

    // Animate in
    setTimeout(() => {
      banner.style.transform = 'translateY(0)';
    }, 100);

    // Add event listeners
    document.getElementById('pwa-install-btn').addEventListener('click', () => {
      this.promptInstall();
    });

    document.getElementById('pwa-close-btn').addEventListener('click', () => {
      this.hideInstallBanner();
    });
  }

  hideInstallBanner() {
    const banner = document.getElementById('pwa-install-banner');
    if (banner) {
      banner.style.transform = 'translateY(-100%)';
      setTimeout(() => banner.remove(), 300);
    }
  }

  async promptInstall() {
    console.log('🚀 promptInstall called');
    console.log('Current state - installPrompt:', !!this.installPrompt, 'isInstallable:', this.isInstallable);
    
    // Check if we have native install prompt
    if (this.installPrompt && this.isInstallable) {
      try {
        console.log('📱 Showing native PWA install prompt');
        const result = await this.installPrompt.prompt();
        console.log('Install prompt result:', result.outcome);
        
        if (result.outcome === 'accepted') {
          console.log('✅ User accepted PWA installation');
          this.isInstallable = false;
          this.installPrompt = null;
          return true;
        } else {
          console.log('❌ User dismissed PWA installation');
          return false;
        }
      } catch (error) {
        console.error('PWA installation error:', error);
        this.showBrowserSpecificInstructions();
        return false;
      }
    } else {
      // Check if PWA meets technical criteria even without native prompt
      if (this.isInstallable) {
        console.log('📱 PWA meets criteria but no native prompt - attempting enhanced detection');
        
        // Enhanced browser-specific installation trigger
        const userAgent = navigator.userAgent;
        let installTriggered = false;
        
        try {
          // Chrome/Edge specific: Try to trigger the install prompt
          if ((userAgent.includes('Chrome') || userAgent.includes('Edge')) && !userAgent.includes('Firefox')) {
            console.log('🔧 Attempting Chrome/Edge install trigger');
            
            // Focus window and dispatch interaction events
            window.focus();
            document.body.click(); // Some browsers require user interaction
            
            // Try dispatching a beforeinstallprompt event manually
            const mockPromptEvent = new Event('beforeinstallprompt');
            mockPromptEvent.prompt = () => Promise.resolve({ outcome: 'dismissed' });
            mockPromptEvent.userChoice = Promise.resolve({ outcome: 'dismissed' });
            
            window.dispatchEvent(mockPromptEvent);
            
            // Wait for potential prompt
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            if (this.installPrompt) {
              installTriggered = true;
              return await this.promptInstall(); // Recursively call with prompt
            }
          }
          
          // If no native trigger worked, show enhanced instructions
          if (!installTriggered) {
            console.log('🔧 No native prompt available, showing enhanced browser instructions');
            this.showEnhancedInstallInstructions();
            return false;
          }
        } catch (error) {
          console.error('Error attempting enhanced install trigger:', error);
          this.showBrowserSpecificInstructions();
          return false;
        }
      } else {
        console.log('❌ PWA does not meet installation criteria or already installed');
        return false;
      }
    }
  }

  showEnhancedInstallInstructions() {
    const userAgent = navigator.userAgent;
    
    // Create a more prominent install guide
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      backdrop-filter: blur(10px);
    `;
    
    let instructions = '';
    if (userAgent.includes('Chrome') && !userAgent.includes('Edge')) {
      instructions = `
        <div style="text-align: center; color: #333;">
          <h2>🟢 Install QuizNest in Chrome</h2>
          <div style="text-align: left; margin: 20px 0;">
            <p><strong>Look for the install icon:</strong></p>
            <p>• Check the address bar for a 📱 install icon</p>
            <p>• Or click the ⋮ menu → "Install QuizNest..."</p>
            <br>
            <p><strong>💡 Tip:</strong> The install option may take a few minutes to appear</p>
          </div>
        </div>
      `;
    } else if (userAgent.includes('Edge')) {
      instructions = `
        <div style="text-align: center; color: #333;">
          <h2>🟦 Install QuizNest in Edge</h2>
          <div style="text-align: left; margin: 20px 0;">
            <p><strong>Method 1:</strong> Look for 📱 in the address bar</p>
            <p><strong>Method 2:</strong> Click ⋯ menu → Apps → "Install this site as an app"</p>
          </div>
        </div>
      `;
    } else {
      instructions = `
        <div style="text-align: center; color: #333;">
          <h2>📱 Install QuizNest</h2>
          <div style="text-align: left; margin: 20px 0;">
            <p>Look for an install option in your browser's menu or address bar.</p>
            <p>For the best experience, use Chrome or Edge.</p>
          </div>
        </div>
      `;
    }
    
    modal.innerHTML = `
      <div style="
        background: white;
        padding: 30px;
        border-radius: 15px;
        max-width: 500px;
        width: 90%;
        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      ">
        ${instructions}
        <button onclick="this.parentElement.parentElement.remove()" style="
          background: #48bb78;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          margin-top: 20px;
          width: 100%;
        ">Got it!</button>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Auto-remove after 10 seconds
    setTimeout(() => {
      if (modal.parentNode) {
        modal.remove();
      }
    }, 10000);
  }

  showBrowserSpecificInstructions() {
    const userAgent = navigator.userAgent;
    let title, content;
    
    if (userAgent.includes('Chrome') && !userAgent.includes('Edge')) {
      title = '🟢 Install in Chrome';
      content = `
        <div style="text-align: left; line-height: 1.6;">
          <h3>Method 1: Address Bar</h3>
          <p>1. Look for the <strong>📱 Install</strong> icon in the address bar</p>
          <p>2. Click it and select <strong>Install</strong></p>
          
          <h3>Method 2: Browser Menu</h3>
          <p>1. Click the <strong>⋮</strong> menu (three dots)</p>
          <p>2. Find <strong>Install Quiz Master...</strong></p>
          <p>3. Click <strong>Install</strong></p>
          
          <div style="background: #f0f8ff; padding: 15px; border-radius: 8px; margin: 15px 0; color: #333;">
            <strong>💡 Tip:</strong> The install option appears after browsing the site for a few minutes.
          </div>
        </div>
      `;
    } else if (userAgent.includes('Edge')) {
      title = '🟦 Install in Microsoft Edge';
      content = `
        <div style="text-align: left; line-height: 1.6;">
          <h3>Method 1: Address Bar</h3>
          <p>1. Look for the <strong>📱 Install app</strong> icon in the address bar</p>
          <p>2. Click it and select <strong>Install</strong></p>
          
          <h3>Method 2: Browser Menu</h3>
          <p>1. Click the <strong>⋯</strong> menu (three dots)</p>
          <p>2. Go to <strong>Apps</strong></p>
          <p>3. Click <strong>Install this site as an app</strong></p>
          <p>4. Click <strong>Install</strong></p>
        </div>
      `;
    } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
      title = '🧭 Install in Safari';
      content = `
        <div style="text-align: left; line-height: 1.6;">
          <h3>For iPhone/iPad:</h3>
          <p>1. Tap the <strong>Share</strong> button (□↗)</p>
          <p>2. Scroll down and tap <strong>Add to Home Screen</strong></p>
          <p>3. Tap <strong>Add</strong></p>
          
          <h3>For Mac:</h3>
          <p>1. Click <strong>File</strong> in menu bar</p>
          <p>2. Select <strong>Add to Dock</strong></p>
        </div>
      `;
    } else if (userAgent.includes('Firefox')) {
      title = '🦊 Firefox PWA Support';
      content = `
        <div style="text-align: left; line-height: 1.6;">
          <p><strong>Firefox has limited PWA support.</strong></p>
          <h3>What you can do:</h3>
          <p>• Bookmark this site for quick access</p>
          <p>• Pin the tab for persistent access</p>
          <p>• Use Chrome or Edge for full PWA experience</p>
        </div>
      `;
    } else {
      title = '📱 Install Quiz Master';
      content = `
        <div style="text-align: left; line-height: 1.6;">
          <h3>Look for install options in:</h3>
          <p>• <strong>Address bar:</strong> Install or app icon</p>
          <p>• <strong>Browser menu:</strong> Install or Add to home screen option</p>
          <p>• <strong>Share menu:</strong> Add to home screen (mobile)</p>
        </div>
      `;
    }

    this.showInstallModal(title, content);
  }

  showManualInstallInstructions() {
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    
    let instructions = '';
    
    if (isIOS) {
      instructions = `📱 Install QuizNest on iOS:\n\n` +
                    `1. Tap the Share button (⬆️) at the bottom\n` +
                    `2. Scroll down and tap "Add to Home Screen"\n` +
                    `3. Tap "Add" to confirm installation`;
    } else if (isMobile) {
      instructions = `📱 Install QuizNest on Android:\n\n` +
                    `1. Tap the menu (⋮) in your browser\n` +
                    `2. Select "Add to Home screen" or "Install app"\n` +
                    `3. Tap "Add" or "Install" to confirm`;
    } else {
      instructions = `💻 Install QuizNest on Desktop:\n\n` +
                    `1. Look for the install icon (⬇️) in your address bar\n` +
                    `2. Click it and select "Install"\n` +
                    `3. Or use browser menu → "Install QuizNest"`;
    }
    
    // Create a better modal instead of alert
    this.showInstallModal(instructions);
  }

  showInstallModal(instructions) {
    // Remove existing modal if any
    const existing = document.getElementById('pwa-install-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'pwa-install-modal';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      backdrop-filter: blur(5px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      padding: 20px;
      box-sizing: border-box;
    `;

    modal.innerHTML = `
      <div style="
        background: linear-gradient(135deg, #1e293b, #334155);
        border-radius: 16px;
        padding: 24px;
        max-width: 400px;
        width: 100%;
        color: white;
        text-align: center;
        box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
        border: 1px solid rgba(255, 255, 255, 0.1);
      ">
        <h3 style="margin: 0 0 16px 0; color: #48bb78; font-size: 1.3rem;">
          📱 Install QuizNest
        </h3>
        <p style="margin: 0 0 20px 0; line-height: 1.6; white-space: pre-line; font-size: 0.95rem;">
          ${instructions}
        </p>
        <button onclick="document.getElementById('pwa-install-modal').remove()" style="
          background: linear-gradient(135deg, #48bb78, #38a169);
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          font-size: 1rem;
          transition: transform 0.2s ease;
        " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
          Got it!
        </button>
      </div>
    `;

    document.body.appendChild(modal);

    // Close on backdrop click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });
  }

  trackInstallation() {
    // Track PWA installation for analytics
    if (typeof window.gtag !== 'undefined') {
      window.gtag('event', 'pwa_install', {
        event_category: 'PWA',
        event_label: 'App Installed'
      });
    }

    // Store installation timestamp
    localStorage.setItem('pwa_installed_at', new Date().toISOString());
  }

  isPWAInstalled() {
    return this.isInstalled || 
           window.matchMedia('(display-mode: standalone)').matches ||
           window.navigator.standalone === true;
  }

  getInstallationInfo() {
    // Enhanced standalone detection
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                        window.navigator.standalone === true ||
                        document.referrer.includes('android-app://') ||
                        window.matchMedia('(display-mode: fullscreen)').matches ||
                        (window.outerHeight === window.innerHeight && window.outerWidth === window.innerWidth);
    
    // Update internal state if we detect standalone mode
    if (isStandalone && !this.isInstalled) {
      this.isInstalled = true;
      console.log('📱 PWA standalone mode detected - app is installed');
      
      // Store installation timestamp if not already stored
      if (!localStorage.getItem('pwa_installed_at')) {
        localStorage.setItem('pwa_installed_at', new Date().toISOString());
      }
      
      // Dispatch installed event
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('pwa-installed', { 
          detail: { isInstalled: true } 
        }));
      }, 100);
    }
    
    return {
      isInstalled: isStandalone || this.isInstalled,
      hasPrompt: !!this.installPrompt,
      isInstallable: this.isInstallable && !isStandalone,
      canInstall: this.isInstallable && !isStandalone,
      installedAt: localStorage.getItem('pwa_installed_at'),
      displayMode: this.getDisplayMode()
    };
  }

  getDisplayMode() {
    if (window.matchMedia('(display-mode: standalone)').matches) {
      return 'standalone';
    }
    if (window.matchMedia('(display-mode: fullscreen)').matches) {
      return 'fullscreen';
    }
    if (window.matchMedia('(display-mode: minimal-ui)').matches) {
      return 'minimal-ui';
    }
    return 'browser';
  }

  // Check for app updates
  async checkForUpdates() {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          await registration.update();
          console.log('🔄 Checked for PWA updates');
        }
      } catch (error) {
        console.error('Update check failed:', error);
      }
    }
  }

  // Share API integration
  async shareApp(data = {}) {
    const shareData = {
      title: 'Quiz App - Test Your Knowledge!',
      text: 'Challenge yourself with interactive quizzes and track your progress!',
      url: window.location.origin,
      ...data
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        console.log('📤 App shared successfully');
        return true;
      } catch (error) {
        console.log('Share cancelled or failed:', error);
      }
    } else {
      // Fallback to clipboard
      try {
        await navigator.clipboard.writeText(shareData.url);
        alert('📋 App link copied to clipboard!');
        return true;
      } catch (error) {
        console.error('Share fallback failed:', error);
      }
    }
    return false;
  }
}

// Create global PWA manager instance
const pwaManager = new PWAManager();

// Export utilities
export default pwaManager;

export const {
  promptInstall,
  isPWAInstalled,
  getInstallationInfo,
  checkForUpdates,
  shareApp
} = pwaManager;

// Auto-check for updates every 30 minutes
if ('serviceWorker' in navigator) {
  setInterval(() => {
    pwaManager.checkForUpdates();
  }, 30 * 60 * 1000);
}
