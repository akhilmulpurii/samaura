'use client';

import { JellyfinUserWithToken } from '@/types/jellyfin';

interface AuthResponse {
  success: boolean;
  user?: JellyfinUserWithToken;
  serverUrl?: string;
  error?: string;
}

// Client-side authentication utilities
export class AuthClient {
  static async login(serverUrl: string, username: string, password: string): Promise<AuthResponse> {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          serverUrl,
          username,
          password,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        return {
          success: true,
          user: data.user,
          serverUrl: data.serverUrl,
        };
      } else {
        return {
          success: false,
          error: data.error || 'Login failed',
        };
      }
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        error: 'Network error occurred',
      };
    }
  }

  static async logout(): Promise<void> {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  static async checkServerHealth(url: string): Promise<{ success: boolean; finalUrl?: string; error?: string }> {
    try {
      const response = await fetch('/api/auth/check-server', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Server health check error:', error);
      return {
        success: false,
        error: 'Network error occurred',
      };
    }
  }
}
