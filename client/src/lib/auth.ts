import { User } from "@shared/schema";

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
}

export function getStoredAuth(): AuthState {
  try {
    const token = localStorage.getItem('auth_token');
    const userStr = localStorage.getItem('auth_user');
    
    if (token && userStr) {
      const user = JSON.parse(userStr);
      return {
        user,
        token,
        isAuthenticated: true,
      };
    }
  } catch (error) {
    console.error('Error parsing stored auth:', error);
  }
  
  return {
    user: null,
    token: null,
    isAuthenticated: false,
  };
}

export function setStoredAuth(user: User, token: string): void {
  localStorage.setItem('auth_token', token);
  localStorage.setItem('auth_user', JSON.stringify(user));
}

export function clearStoredAuth(): void {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('auth_user');
}

export function getAuthHeaders(): Record<string, string> {
  const { token } = getStoredAuth();
  if (token) {
    return {
      'Authorization': `Bearer ${token}`,
    };
  }
  return {};
}
