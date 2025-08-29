// Scanner Component
const Scanner = () => {
  const [scanning, setScanning] = React.useState(false);
  const [scanResult, setScanResult] = React.useState(null);
  const [error, setError] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  
  const scannerRef = React.useRef(null);
  const readerRef = React.useRef(null);
  
  // Start scanning
  const startScanner = () => {
    setScanning(true);
    setScanResult(null);
    setError(null);
    
    // Initialize the HTML5 QR code scanner
    readerRef.current = new Html5Qrcode("reader");
    
    const config = { fps: 10, qrbox: { width: 250, height: 250 } };
    
    // Start scanning
    readerRef.current.start(
      { facingMode: "environment" },
      config,
      onScanSuccess,
      onScanFailure
    );
  };
  
  // Stop scanning
  const stopScanner = () => {
    if (readerRef.current && readerRef.current.isScanning) {
      readerRef.current.stop()
        .then(() => {
          setScanning(false);
        })
        .catch(err => {
          console.error('Error stopping scanner:', err);
        });
    }
  };
  
  // Handle successful scan
  const onScanSuccess = async (decodedText) => {
    // Stop scanning after successful scan
    stopScanner();
    
    setLoading(true);
    
    try {
      // Extract user ID from the URL
      const url = new URL(decodedText);
      const pathParts = url.pathname.split('/');
      const userId = pathParts[pathParts.length - 1];
      
      // Verify the user's opt-in status
      const response = await fetch(`/api/verify/${userId}`);
      const data = await response.json();
      
      if (response.ok) {
        setScanResult({
          success: true,
          user: data.user
        });
      } else {
        setScanResult({
          success: false,
          message: data.message || 'Verification failed'
        });
      }
    } catch (err) {
      setError('Invalid QR code or verification failed');
      console.error('Verification error:', err);
    } finally {
      setLoading(false);
    }
  };
  
  // Handle scan failure
  const onScanFailure = (error) => {
    // We don't need to do anything here as this is called frequently when no QR code is detected
    // console.error('Scan failure:', error);
  };
  
  // Clean up on component unmount
  React.useEffect(() => {
    return () => {
      if (readerRef.current && readerRef.current.isScanning) {
        readerRef.current.stop().catch(err => {
          console.error('Error stopping scanner on unmount:', err);
        });
      }
    };
  }, []);
  
  // Format time for display
  const formatTime = (isoString) => {
    if (!isoString) return 'N/A';
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  return (
    <div className="card">
      <h2 className="text-2xl font-bold mb-4">QR Code Scanner</h2>
      
      {error && (
        <div className="status status-danger mb-4">
          {error}
        </div>
      )}
      
      {!scanning && !scanResult && (
        <div className="text-center mb-4">
          <button 
            className="btn btn-primary"
            onClick={startScanner}
          >
            Start Scanner
          </button>
        </div>
      )}
      
      {scanning && (
        <div className="scanner-container mb-4">
          <div id="reader"></div>
          <div className="text-center mt-4">
            <button 
              className="btn btn-secondary"
              onClick={stopScanner}
            >
              Cancel Scanning
            </button>
          </div>
        </div>
      )}
      
      {loading && (
        <div className="text-center mb-4">
          <p>Verifying...</p>
        </div>
      )}
      
      {scanResult && (
        <div className="mb-4">
          <h3 className="text-lg font-bold mb-2">Scan Result:</h3>
          
          {scanResult.success ? (
            <div>
              <div className={`status ${scanResult.user.is_opted_in ? 'status-success' : 'status-danger'} mb-2`}>
                {scanResult.user.is_opted_in ? (
                  <>✅ Verified: {scanResult.user.name} is opted in for lunch</>
                ) : (
                  <>❌ Not Verified: {scanResult.user.name} has not opted in for lunch</>
                )}
              </div>
              
              {scanResult.user.is_opted_in && scanResult.user.opt_in_time && (
                <p className="mb-2">Opted in at: {formatTime(scanResult.user.opt_in_time)}</p>
              )}
              
              <div className="mt-4">
                <button 
                  className="btn btn-primary"
                  onClick={() => {
                    setScanResult(null);
                    startScanner();
                  }}
                >
                  Scan Another
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div className="status status-danger mb-2">
                {scanResult.message || 'Verification failed'}
              </div>
              
              <div className="mt-4">
                <button 
                  className="btn btn-primary"
                  onClick={() => {
                    setScanResult(null);
                    startScanner();
                  }}
                >
                  Try Again
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      
      <div className="mt-4">
        <h3 className="text-lg font-bold mb-2">Instructions:</h3>
        <ol className="ml-4" style={{ listStyleType: 'decimal' }}>
          <li>Click "Start Scanner" to activate the camera</li>
          <li>Point the camera at a user's QR code</li>
          <li>The system will automatically verify their opt-in status</li>
          <li>Green checkmark means they're verified for lunch</li>
        </ol>
      </div>
    </div>
  );
};
