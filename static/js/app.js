// Main App Component
const App = () => {
  const [user, setUser] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [currentPage, setCurrentPage] = React.useState('login');
  const [error, setError] = React.useState(null);
  
  // Parse URL for verification
  const [verificationParams, setVerificationParams] = React.useState(null);
  
  // Check if user is already logged in and parse URL
  React.useEffect(() => {
    // Parse URL for verification
    const path = window.location.pathname;
    const verifyMatch = path.match(/^\/verify-meal\/([^\/]+)\/([^\/]+)$/);
    
    if (verifyMatch) {
      setVerificationParams({
        date: verifyMatch[1],
        token: verifyMatch[2]
      });
      setCurrentPage('verification');
    }
    
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/user');
        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
          if (currentPage === 'login') {
            setCurrentPage('opt-in');
          }
        }
      } catch (err) {
        console.error('Auth check failed:', err);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  // Handle login
  const handleLogin = async (email, password) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setUser(data.user);
        setCurrentPage('opt-in');
      } else {
        setError(data.message || 'Login failed');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      await fetch('/api/logout', { method: 'POST' });
      setUser(null);
      setCurrentPage('login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  // Navigation
  const navigate = (page) => {
    setCurrentPage(page);
  };

  // Render loading state
  if (loading && !user) {
    return (
      <div className="app-container">
        <div className="app-content flex justify-center items-center">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  // Render login page if not authenticated
  if (!user) {
    return <Login onLogin={handleLogin} error={error} />;
  }

  // Render verification page
  if (currentPage === 'verification') {
    return (
      <div className="app-container">
        <header className="app-header">
          <div className="container flex justify-between items-center">
            <div className="flex items-center">
              <img 
                src="/static/images/a.png" 
                alt="Company Logo" 
                className="logo-image mr-4"
                style={{ height: '40px', cursor: 'pointer' }}
                onClick={() => user && navigate('opt-in')}
              />
              <h1 className="text-xl font-bold">Meal Track</h1>
            </div>
            {user ? (
              <a 
                href="#" 
                className="nav-link"
                onClick={(e) => { e.preventDefault(); handleLogout(); }}
              >
                Logout
              </a>
            ) : (
              <a 
                href="/login" 
                className="nav-link"
              >
                Login
              </a>
            )}
          </div>
        </header>

        <main className="app-content">
          <div className="container">
            <MealVerification 
              date={verificationParams?.date} 
              token={verificationParams?.token}
              userId={user?.id}
            />
          </div>
        </main>

        <footer className="app-footer">
          <div className="container">
            <p>&copy; {new Date().getFullYear()} Meal Track</p>
          </div>
        </footer>
      </div>
    );
  }
  
  // Render main app with navigation
  return (
    <div className="app-container">
      <header className="app-header">
        <div className="container flex justify-between items-center">
          <div className="flex items-center">
            <img 
              src="/static/images/a.png" 
              alt="Company Logo" 
              className="logo-image mr-4"
              style={{ height: '40px', cursor: 'pointer' }}
              onClick={() => navigate('opt-in')}
            />
            <h1 className="text-xl font-bold">Meal Track</h1>
          </div>
          <nav className="nav">
            <a 
              href="#" 
              className={`nav-link ${currentPage === 'opt-in' ? 'active' : ''}`}
              onClick={(e) => { e.preventDefault(); navigate('opt-in'); }}
            >
              Meal Opt-In
            </a>
            {user.is_admin && (
              <a 
                href="#" 
                className={`nav-link ${currentPage === 'admin' ? 'active' : ''}`}
                onClick={(e) => { e.preventDefault(); navigate('admin'); }}
              >
                Admin
              </a>
            )}
            <a 
              href="#" 
              className="nav-link"
              onClick={(e) => { e.preventDefault(); handleLogout(); }}
            >
              Logout
            </a>
          </nav>
        </div>
      </header>

      <main className="app-content">
        <div className="container">
          {currentPage === 'opt-in' && <OptIn user={user} setUser={setUser} />}
          {currentPage === 'admin' && user.is_admin && <AdminDashboard />}
        </div>
      </main>

      <footer className="app-footer">
        <div className="container">
          <p>&copy; {new Date().getFullYear()} Meal Track</p>
        </div>
      </footer>
    </div>
  );
};

// Render the App
ReactDOM.createRoot(document.getElementById('root')).render(<App />);
