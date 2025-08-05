import { useState, useEffect } from 'react';
import { User } from '@shared/schema';
import { getStoredAuth, setStoredAuth, clearStoredAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // Check for stored auth on mount
    const storedAuth = getStoredAuth();
    if (storedAuth.isAuthenticated) {
      setUser(storedAuth.user);
      setIsAuthenticated(true);
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await api.login(email, password);
      const data = await response.json();
      
      setUser(data.user);
      setIsAuthenticated(true);
      setStoredAuth(data.user, data.token);
      
      toast({
        title: "Login successful",
        description: "Welcome back!",
      });
      
      return data;
    } catch (error: any) {
      toast({
        title: "Login failed",
        description: error.message || "Invalid credentials",
        variant: "destructive",
      });
      throw error;
    }
  };

  const register = async (email: string, password: string) => {
    try {
      const response = await api.register(email, password);
      const data = await response.json();
      
      setUser(data.user);
      setIsAuthenticated(true);
      setStoredAuth(data.user, data.token);
      
      toast({
        title: "Registration successful",
        description: "Welcome to PDF Insight Extractor!",
      });
      
      return data;
    } catch (error: any) {
      toast({
        title: "Registration failed",
        description: error.message || "Registration failed",
        variant: "destructive",
      });
      throw error;
    }
  };

  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    clearStoredAuth();
    
    toast({
      title: "Logout realizado",
      description: "Você foi desconectado com sucesso.",
    });
    
    // Navigate to login page
    window.location.href = '/login';
  };

  return {
    user,
    isAuthenticated,
    isLoading,
    login,
    register,
    logout,
  };
}
