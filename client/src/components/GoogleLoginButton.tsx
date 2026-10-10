import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import authService from '../services/authService';
import { useMessage } from '../context/MessageContext';

declare global {
  interface Window {
    google?: any;
  }
}

interface GoogleLoginButtonProps {
  text?: string;
  className?: string;
  disabled?: boolean;
}

export default function GoogleLoginButton({
  text = 'Continue with Google',
  className = '',
  disabled = false,
}: GoogleLoginButtonProps) {
  const navigate = useNavigate();
  const { showSuccess, showError } = useMessage();
  const [loading, setLoading] = useState(false);
  const [isGsiLoaded, setIsGsiLoaded] = useState(false);
  const tokenClientRef = useRef<any>(null);

  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
  const serverUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:3000';

  useEffect(() => {
    // If Google GSI script is already present
    if (window.google?.accounts?.oauth2) {
      setIsGsiLoaded(true);
      return;
    }

    const scriptId = 'google-gsi-client-script';
    let script = document.getElementById(scriptId) as HTMLScriptElement | null;

    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        setIsGsiLoaded(true);
      };
      script.onerror = () => {
        console.warn('Failed to load Google Identity Services SDK');
      };
      document.head.appendChild(script);
    } else {
      script.addEventListener('load', () => setIsGsiLoaded(true));
    }
  }, []);

  useEffect(() => {
    if (isGsiLoaded && clientId && window.google?.accounts?.oauth2) {
      try {
        tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: 'openid email profile',
          callback: async (response: any) => {
            if (response.error) {
              setLoading(false);
              if (response.error !== 'access_denied') {
                showError('Google service is not working. Please try again later.', 'Google Sign-In Error');
              }
              return;
            }

            if (response.access_token) {
              try {
                const res = await authService.googleAuth({ accessToken: response.access_token });
                showSuccess(res.message || 'Successfully signed in with Google!', 'Welcome');
                setTimeout(() => {
                  navigate('/');
                }, 400);
              } catch (err: any) {
                const msg = err.response?.data?.message || 'Google service is not working. Please try again later.';
                showError(msg, 'Google Sign-In Failed');
              } finally {
                setLoading(false);
              }
            }
          },
        });
      } catch (e) {
        console.error('Error initializing Google token client:', e);
      }
    }
  }, [isGsiLoaded, clientId, navigate, showError, showSuccess]);

  const handleGoogleClick = () => {
    // 1. If Google GIS token client is initialized -> open official popup
    if (clientId && tokenClientRef.current) {
      setLoading(true);
      tokenClientRef.current.requestAccessToken({ prompt: 'select_account' });
      return;
    }

    // 2. Fallback to redirect flow through backend
    if (serverUrl) {
      setLoading(true);
      window.location.href = `${serverUrl}/api/auth/google`;
      return;
    }

    // 3. Fallback error
    showError(
      'Google service is currently not working. Please try again later.',
      'Google Sign-In Error'
    );
  };

  return (
    <button
      type="button"
      onClick={handleGoogleClick}
      disabled={disabled || loading}
      className={`w-full py-2.5 sm:py-3 px-4 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-700 text-xs sm:text-sm font-semibold flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50 transition-all duration-200 shadow-xs hover:shadow-md active:scale-[0.99] ${className}`}
      title={text}
    >
      {loading ? (
        <div className="w-4 h-4 border-2 border-slate-300 border-t-purple-600 rounded-full animate-spin shrink-0" />
      ) : (
        <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
          />
        </svg>
      )}
      <span>{loading ? 'Connecting with Google...' : text}</span>
    </button>
  );
}
