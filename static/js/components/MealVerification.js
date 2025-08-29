// MealVerification Component
const MealVerification = ({ date, token, userId }) => {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [verificationData, setVerificationData] = React.useState(null);
  const [requiresLogin, setRequiresLogin] = React.useState(false);
  const [refreshing, setRefreshing] = React.useState(false);
  
  // Format date for display
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };
  
  // Function to fetch verification data
  const fetchVerificationData = async () => {
    setRefreshing(true);
    setError(null);
    
    try {
      // Add user ID to query params if available
      const userParam = userId ? `?user_id=${userId}` : '';
      const response = await fetch(`/api/verify-meal/${date}/${token}${userParam}`);
      const data = await response.json();
      
      if (response.ok) {
        if (data.requires_login) {
          setRequiresLogin(true);
        } else {
          setVerificationData(data);
        }
      } else {
        setError(data.message || 'Failed to verify meal status');
      }
    } catch (err) {
      setError('An error occurred while verifying meal status');
      console.error('Verification error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  // Load verification data on component mount
  React.useEffect(() => {
    if (date && token) {
      fetchVerificationData();
    } else {
      setError('Invalid verification link');
      setLoading(false);
    }
  }, [date, token, userId]);
  
  // Set up auto-refresh interval
  React.useEffect(() => {
    // Auto-refresh every 5 seconds
    const refreshInterval = setInterval(() => {
      if (date && token) {
        fetchVerificationData();
      }
    }, 5000);
    
    // Clean up interval on component unmount
    return () => clearInterval(refreshInterval);
  }, [date, token, userId]);
  
  // Render meal status with emoji
  const renderMealStatus = (meal) => {
    const emoji = meal.name === 'Breakfast' ? '🍳' : 
                 meal.name === 'Lunch' ? '🍽️' : 
                 meal.name === 'Dinner' ? '🍽️' : '🍴';
    
    return (
      <div key={meal.meal_type_id} className="meal-status mb-4 p-3 border rounded">
        <div className="flex items-center">
          <div className="meal-emoji text-3xl mr-4">{emoji}</div>
          <div>
            <h4 className="text-lg font-bold">{meal.name}</h4>
            {meal.opted_in ? (
              <div className="status status-success text-lg">
                ✅ Opted In
              </div>
            ) : (
              <div className="status status-danger text-lg">
                ❌ Not Opted In
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };
  
  // Render login required message
  const renderLoginRequired = () => {
    return (
      <div className="login-required text-center p-6">
        <div className="text-6xl mb-4">🔒</div>
        <h3 className="text-xl font-bold mb-2">Login Required</h3>
        <p className="mb-4">Please log in to see your meal verification status.</p>
        <a href="/login" className="btn btn-primary">Go to Login</a>
      </div>
    );
  };
  
  // Render verification result
  const renderVerificationResult = () => {
    if (!verificationData) return null;
    
    return (
      <div className="verification-result">
        <div className="user-info mb-4">
          <h3 className="text-xl font-bold">{verificationData.user.name}</h3>
          <p className="text-gray-600">{verificationData.user.email}</p>
        </div>
        
        <div className="date-info mb-4">
          <p className="text-lg">
            <strong>Date:</strong> {formatDate(verificationData.date)}
          </p>
        </div>
        
        <div className="meal-statuses">
          {verificationData.meals.map(meal => renderMealStatus(meal))}
        </div>
      </div>
    );
  };
  
  // Handle manual refresh
  const handleRefresh = () => {
    fetchVerificationData();
  };
  
  return (
    <div className="card verification-card">
      <div className="company-logo text-center mb-4">
        <img 
          src="/static/images/a.png" 
          alt="Company Logo" 
          className="logo-image mx-auto"
          style={{ maxHeight: '80px' }}
        />
      </div>
      
      <h2 className="text-2xl font-bold mb-4 text-center">Meal Verification</h2>
      
      {error && (
        <div className="status status-danger mb-4">
          {error}
        </div>
      )}
      
      {loading && !refreshing ? (
        <div className="loading-spinner text-center p-6">Loading...</div>
      ) : (
        <>
          {requiresLogin ? renderLoginRequired() : renderVerificationResult()}
          
          <div className="refresh-controls text-center mt-4">
            <button 
              className="btn btn-primary"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              {refreshing ? 'Refreshing...' : 'Refresh Status'}
            </button>
            <p className="text-sm text-gray-500 mt-2">
              Status auto-refreshes every 5 seconds
            </p>
          </div>
        </>
      )}
      
      <div className="mt-6 text-center">
        <p className="text-sm text-gray-600">
          This verification is valid only for the date shown above.
        </p>
      </div>
    </div>
  );
};
