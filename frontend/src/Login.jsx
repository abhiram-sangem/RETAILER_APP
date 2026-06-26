import React,{useState} from 'react';
import axios from 'axios';
const API_URL = import.meta.env.VITE_API_URL

function Login({onLoginSuccess}) { 
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleLogin = async (e) => {
        e.preventDefault();

        try {
            const response = await axios.post(`${API_URL}/api/auth/login`, {
                username,
                password
            });

            if (response.data.status === 'SUCCESS') {
                // Save login state locally
                localStorage.setItem('isAuthenticated', 'true');
                localStorage.setItem('userRole', response.data.role);
                onLoginSuccess(); 
            }
        } catch (err) {
            setError('Invalid username or password');
        }
    };

    return (
        <div>
            <h2>RetailerLogin</h2>
            <form onSubmit={handleLogin}>
                <div>
                    <label>Username:</label>
                    <input
                        type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                />
                </div>
        
            <div>
                <label>Password:</label>
                <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />
            </div>
            {error && <p>{error}</p>}
            <button type="submit">Login</button>
            </form>
        </div>
    );
    export default Login;
}
