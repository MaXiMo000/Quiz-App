import React, { useState, useEffect } from 'react';

const PWAInstallTest = () => {
  const [pwaStatus, setPwaStatus] = useState(null);
  const [installabilityCheck, setInstallabilityCheck] = useState(null);
  const [logs, setLogs] = useState([]);

  const addLog = (message) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  useEffect(() => {
    // Check PWA status on mount
    if (window.pwaManager) {
      const status = window.pwaManager.getInstallationInfo();
      setPwaStatus(status);
    }

    // Listen for PWA events
    const handleInstallable = () => {
      updateStatus();
    };

    const handleInstalled = () => {
      updateStatus();
    };

    window.addEventListener('pwa-installable', handleInstallable);
    window.addEventListener('pwa-installed', handleInstalled);

    return () => {
      window.removeEventListener('pwa-installable', handleInstallable);
      window.removeEventListener('pwa-installed', handleInstalled);
    };
  }, []);

  const updateStatus = () => {
    if (window.pwaManager) {
      const status = window.pwaManager.getInstallationInfo();
      setPwaStatus(status);
    }
  };

  const checkInstallability = () => {
    if (window.pwaManager) {
      const criteria = window.pwaManager.checkInstallability();
      setInstallabilityCheck(criteria);
    }
  };

  const testInstallFlow = () => {
    if (window.pwaDebug) {
      window.pwaDebug.testInstallFlow();
    }
  };

  const forceInstallCheck = () => {
    if (window.pwaDebug) {
      addLog('🔄 Forcing PWA install check...');
      window.pwaDebug.forceInstallCheck();
    }
  };

  const clearLogs = () => {
    setLogs([]);
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>🔧 PWA Installation Test Page</h1>

      <div style={{ marginBottom: '20px' }}>
        <h2>📱 Current PWA Status</h2>
        <pre style={{ background: '#f5f5f5', padding: '10px', borderRadius: '5px' }}>
          {pwaStatus ? JSON.stringify(pwaStatus, null, 2) : 'Loading...'}
        </pre>
        <button onClick={updateStatus} style={{ marginTop: '10px' }}>
          🔄 Refresh Status
        </button>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h2>✅ Installability Criteria</h2>
        <pre style={{ background: '#f5f5f5', padding: '10px', borderRadius: '5px' }}>
          {installabilityCheck ? JSON.stringify(installabilityCheck, null, 2) : 'Click "Check Criteria" to test'}
        </pre>
        <button onClick={checkInstallability} style={{ marginTop: '10px' }}>
          🔍 Check Criteria
        </button>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h2>🧪 Test Actions</h2>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button onClick={testInstallFlow}>
            🚀 Test Install Flow
          </button>
          <button onClick={forceInstallCheck}>
            🔄 Force Install Check
          </button>
          <button
            onClick={() => window.pwaDebug?.simulateInstallPrompt()}
          >
            🎯 Simulate Install Prompt
          </button>
          <button
            onClick={async () => {
              await window.pwaDebug?.getManifest();
            }}
          >
            📋 Get Manifest
          </button>
          <button onClick={() => window.pwaDebug?.clearPWAData()}>
            🗑️ Clear PWA Data
          </button>
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h2>📝 Test Logs</h2>
        <div style={{
          background: '#000',
          color: '#00ff00',
          padding: '10px',
          borderRadius: '5px',
          height: '200px',
          overflow: 'auto',
          fontSize: '12px'
        }}>
          {logs.map((log, index) => (
            <div key={index}>{log}</div>
          ))}
        </div>
        <button onClick={clearLogs} style={{ marginTop: '10px' }}>
          🗑️ Clear Logs
        </button>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h2>💡 Troubleshooting Tips</h2>
        <ul style={{ textAlign: 'left' }}>
          <li>✅ Make sure you're using HTTPS or localhost</li>
          <li>✅ Check that manifest.json is accessible</li>
          <li>✅ Verify service worker is registered</li>
          <li>✅ Wait 2-3 minutes for browser to detect PWA criteria</li>
          <li>✅ Try refreshing the page</li>
          <li>✅ Test in Chrome DevTools Application tab</li>
          <li>✅ Check browser console for errors</li>
        </ul>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h2>🌐 Browser Information</h2>
        <pre style={{ background: '#f5f5f5', padding: '10px', borderRadius: '5px', fontSize: '12px' }}>
{`User Agent: ${navigator.userAgent}
Location: ${window.location.href}
Protocol: ${window.location.protocol}
Is Secure: ${location.protocol === 'https:' || location.hostname === 'localhost'}
Has Service Worker: ${'serviceWorker' in navigator}
Has Manifest: ${!!document.querySelector('link[rel="manifest"]')}
Display Mode: ${window.matchMedia('(display-mode: standalone)').matches ? 'standalone' : 'browser'}
Is Installed: ${window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true}`}
        </pre>
      </div>
    </div>
  );
};

export default PWAInstallTest;
