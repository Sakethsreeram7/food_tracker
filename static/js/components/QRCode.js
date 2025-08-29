// QRCode Component
const QRCode = ({ user }) => {
  const [qrCode, setQrCode] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  
  // Fetch QR code on component mount
  React.useEffect(() => {
    const fetchQRCode = async () => {
      try {
        const response = await fetch('/api/qr-code');
        
        if (response.ok) {
          const data = await response.json();
          setQrCode(data);
        } else {
          const errorData = await response.json();
          setError(errorData.message || 'Failed to fetch QR code');
        }
      } catch (err) {
        setError('An error occurred while fetching your QR code');
        console.error('QR code fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchQRCode();
  }, []);
  
  // Handle QR code download
  const handleDownload = () => {
    if (!qrCode) return;
    
    // Create a temporary link element
    const link = document.createElement('a');
    link.href = qrCode.qr_code;
    link.download = `lunch-qr-code-${user.id}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  if (loading) {
    return (
      <div className="card">
        <h2 className="text-2xl font-bold mb-4">My QR Code</h2>
        <div className="flex justify-center">
          <p>Loading your QR code...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="card">
        <h2 className="text-2xl font-bold mb-4">My QR Code</h2>
        <div className="status status-danger mb-4">
          {error}
        </div>
        <button 
          className="btn btn-primary"
          onClick={() => window.location.reload()}
        >
          Try Again
        </button>
      </div>
    );
  }
  
  return (
    <div className="card">
      <h2 className="text-2xl font-bold mb-4">My QR Code</h2>
      
      {!user.is_opted_in ? (
        <div className="status status-danger mb-4">
          ⚠️ You have not opted in for lunch today. Please opt-in first.
        </div>
      ) : (
        <div className="qr-container">
          <div className="qr-code mb-4">
            <img 
              src={qrCode.qr_code} 
              alt="QR Code for lunch verification" 
              style={{ width: '250px', height: '250px' }}
            />
          </div>
          
          <div className="text-center mb-4">
            <p className="status status-success">
              ✅ You are opted in for lunch today
            </p>
          </div>
          
          <button 
            className="btn btn-primary"
            onClick={handleDownload}
          >
            Download QR Code
          </button>
        </div>
      )}
      
      <div className="mt-4">
        <h3 className="text-lg font-bold mb-2">Instructions:</h3>
        <ol className="ml-4" style={{ listStyleType: 'decimal' }}>
          <li>Make sure you've opted in for lunch today</li>
          <li>Show this QR code to the lunch administrator</li>
          <li>They will scan it to verify your opt-in status</li>
        </ol>
      </div>
    </div>
  );
};
