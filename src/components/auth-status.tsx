'use client';

import { useAuth } from '@/hooks/useAuth';
import { AuthClient } from '@/lib/auth-client';
import { useState } from 'react';

export function AuthStatus() {
  const {
    serverUrl,
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
    isTokenExpired,
  } = useAuth();

  const [loginForm, setLoginForm] = useState({
    serverUrl: '',
    username: '',
    password: '',
  });
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setError(null);

    try {
      const result = await AuthClient.login(
        loginForm.serverUrl,
        loginForm.username,
        loginForm.password
      );

      if (result.success && result.user && result.serverUrl) {
        login(result.serverUrl, result.user);
      } else {
        setError(result.error || 'Login failed');
      }
    } catch (err) {
      setError('Network error occurred');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await AuthClient.logout();
    logout();
  };

  if (isLoading) {
    return <div>Loading auth status...</div>;
  }

  return (
    <div className="p-4 border rounded-lg">
      <h2 className="text-lg font-semibold mb-4">Auth Status</h2>
      
      {isAuthenticated ? (
        <div className="space-y-2">
          <div className="text-green-600">✓ Authenticated</div>
          <div><strong>Server:</strong> {serverUrl}</div>
          <div><strong>User:</strong> {user?.Name}</div>
          <div><strong>User ID:</strong> {user?.Id}</div>
          <div><strong>Token Expired:</strong> {isTokenExpired() ? 'Yes' : 'No'}</div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Logout
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="text-red-600">✗ Not authenticated</div>
          
          <form onSubmit={handleLogin} className="space-y-3">
            <div>
              <label className="block text-sm font-medium">Server URL</label>
              <input
                type="url"
                value={loginForm.serverUrl}
                onChange={(e) => setLoginForm(prev => ({ ...prev, serverUrl: e.target.value }))}
                placeholder="https://your-jellyfin-server.com"
                className="w-full p-2 border rounded"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium">Username</label>
              <input
                type="text"
                value={loginForm.username}
                onChange={(e) => setLoginForm(prev => ({ ...prev, username: e.target.value }))}
                className="w-full p-2 border rounded"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium">Password</label>
              <input
                type="password"
                value={loginForm.password}
                onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                className="w-full p-2 border rounded"
                required
              />
            </div>
            
            {error && (
              <div className="text-red-600 text-sm">{error}</div>
            )}
            
            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            >
              {isLoggingIn ? 'Logging in...' : 'Login'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
