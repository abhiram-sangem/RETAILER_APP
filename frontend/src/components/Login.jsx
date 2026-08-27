import React from 'react';

export default function Login({ 
  handleLogin, 
  loginError, 
  username, 
  setUsername, 
  password, 
  setPassword 
}) {
  return (
    <div className="modal-overlay login-overlay">
      <form onSubmit={handleLogin} className="card login-card">
        <h2 className="modal-header-title text-center">Retailer Login</h2>
        {loginError && <div className="text-danger mb-0 text-center">{loginError}</div>}
        <div className="form-group">
          <label className="form-label">Username</label>
          <input 
            type="text" 
            value={username} 
            onChange={(e) => setUsername(e.target.value)} 
            className="form-control" 
            required 
          />
        </div>
        <div className="form-group">
          <label className="form-label">Password</label>
          <input 
            type="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            className="form-control" 
            required 
          />
        </div>
        <button type="submit" className="btn btn-primary btn-checkout">
          Login to Dashboard
        </button>
      </form>
    </div>
  );
}