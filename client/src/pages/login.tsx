import { useState, useEffect } from 'react';
import { useLocation, Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { FileText, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { setStoredAuth } from '@/lib/auth';

export default function Login() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { login, register } = useAuth();



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setIsLoading(true);
    try {
      if (isRegistering) {
        await register(email, password);
      } else {
        await login(email, password);
      }
      setLocation('/dashboard');
    } catch (error) {
      // Error is handled by useAuth hook
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mb-6 shadow-xl">
            <FileText className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">PDF Insight Extractor</h1>
          <p className="text-slate-300">Extract insights from your PDF documents with AI</p>
        </div>
        
        <Card className="shadow-2xl bg-slate-800/90 backdrop-blur-sm border-slate-700">
          <CardContent className="p-8">
            <form onSubmit={handleSubmit} className="space-y-6" data-testid="form-auth">
              <div>
                <Label htmlFor="email" className="block text-sm font-medium text-slate-200 mb-2">
                  Email Address
                </Label>
                <Input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="your@email.com"
                  className="w-full bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400 focus:border-blue-500"
                  data-testid="input-email"
                />
              </div>
              
              <div>
                <Label htmlFor="password" className="block text-sm font-medium text-slate-200 mb-2">
                  Password
                </Label>
                <Input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400 focus:border-blue-500"
                  data-testid="input-password"
                />
              </div>
              
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold shadow-lg"
                data-testid="button-submit"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {isRegistering ? 'Creating Account...' : 'Signing In...'}
                  </>
                ) : (
                  isRegistering ? 'Create Account' : 'Sign In'
                )}
              </Button>
              
              <div className="text-center space-y-2">
                <button
                  type="button"
                  onClick={() => setIsRegistering(!isRegistering)}
                  className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
                  data-testid="button-toggle-mode"
                >
                  {isRegistering 
                    ? 'Already have an account? Sign in' 
                    : "Don't have an account? Create one"
                  }
                </button>
                
                {!isRegistering && (
                  <div>
                    <Link href="/forgot-password">
                      <button
                        type="button"
                        className="text-sm text-slate-400 hover:text-slate-300 transition-colors"
                        data-testid="link-forgot-password"
                      >
                        Forgot password
                      </button>
                    </Link>
                  </div>
                )}
              </div>
              

            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}