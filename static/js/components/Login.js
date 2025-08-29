// Login Component
const Login = ({ onLogin, error }) => {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  
  const handleSubmit = (e) => {
    e.preventDefault();
    onLogin(email, password);
  };
  
  return (
    <div className="app-container">
      <div className="app-content flex justify-center items-center">
        <div className="card" style={{ maxWidth: '400px', width: '100%' }}>
          <h2 className="text-2xl font-bold text-center mb-4">Lunch Track</h2>
          <p className="text-center mb-4 text-secondary">Sign in to opt-in for lunch</p>
          
          {error && (
            <div className="status status-danger mb-4 text-center">
              {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="email" className="form-label">Email</label>
              <input
                type="email"
                id="email"
                className="form-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="password" className="form-label">Password</label>
              <input
                type="password"
                id="password"
                className="form-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
              Sign In
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
