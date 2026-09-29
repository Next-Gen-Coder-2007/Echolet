import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import logoImg from '../assets/logo.png';
import authImg from '../assets/auth.jpeg';

export default function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setSubmitMessage({ type: 'error', text: 'Please enter your username and password.' });
      return;
    }

    setIsSubmitting(true);
    setSubmitMessage(null);

    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitMessage({
        type: 'success',
        text: `Signed in successfully. Welcome back, ${username}!`,
      });
      setTimeout(() => {
        navigate('/');
      }, 900);
    }, 500);
  };

  const handleGoogleSignIn = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitMessage({
        type: 'success',
        text: 'Google authentication connected successfully.',
      });
    }, 400);
  };

  const cardShadowStyle = {
    boxShadow: 'rgba(0, 0, 0, 0.16) 0px 3px 6px, rgba(0, 0, 0, 0.23) 0px 3px 6px',
  };

  return (
    <div className="min-h-screen bg-white text-slate-800 flex flex-col relative overflow-hidden selection:bg-purple-600 selection:text-white">
      <div className="absolute -left-20 sm:-left-28 top-1/2 -translate-y-1/2 w-64 h-64 sm:w-84 sm:h-84 rounded-full bg-[#00A3FF] pointer-events-none z-0" />
      <div className="absolute left-1/3 sm:left-[35%] top-10 sm:top-12 w-72 h-72 sm:w-96 sm:h-96 rounded-full bg-[#8B5CF6] pointer-events-none z-0" />

      <header className="w-full max-w-7xl mx-auto px-6 py-4 flex items-center relative z-10">
        <Link to="/" className="flex items-center gap-2.5">
          <img src={logoImg} alt="Echolet" className="w-9 h-9 object-contain" />
          <span className="text-2xl font-bold tracking-tight text-slate-900">
            Echo<span className="bg-gradient-to-r from-[#00b4d8] via-[#7928ca] to-[#ff0080] bg-clip-text text-transparent">let</span>
          </span>
        </Link>
      </header>

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-center py-4 relative z-10">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
          <div className="lg:col-span-7 flex items-center justify-center">
            <div
              style={cardShadowStyle}
              className="w-full max-w-[460px] sm:max-w-[480px] bg-white rounded-lg p-2 sm:p-2.5 border border-slate-200"
            >
              <img
                src={authImg}
                alt="Authentication"
                className="w-full aspect-[4/3] object-cover rounded-md block"
              />
            </div>
          </div>

          <div className="lg:col-span-5 flex justify-center w-full">
            <div
              style={cardShadowStyle}
              className="w-full max-w-[400px] bg-white rounded-lg p-6 sm:p-7 border border-slate-200"
            >
              <div className="text-center mb-5">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                  Welcome Back
                </h1>
                <p className="mt-1 text-xs sm:text-sm text-slate-500">
                  Please sign in to your Echolet account
                </p>
              </div>

              {submitMessage && (
                <div
                  className={`mb-3.5 p-2.5 rounded-md text-xs flex items-center gap-2 ${
                    submitMessage.type === 'success'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border border-rose-200'
                  }`}
                >
                  <span className="font-bold">{submitMessage.type === 'success' ? '✓' : '!'}</span>
                  <span>{submitMessage.text}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-3.5">
                <div>
                  <label
                    htmlFor="username"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Username or Email Address
                  </label>
                  <input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your username or email"
                    required
                    className="w-full px-3 py-2 text-sm rounded-md border border-slate-300 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-600"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label
                      htmlFor="password"
                      className="block text-xs font-semibold text-slate-700"
                    >
                      Password
                    </label>
                    <a
                      href="#forgot"
                      onClick={(e) => {
                        e.preventDefault();
                        alert('Password reset link sent to your registered email address.');
                      }}
                      className="text-xs text-purple-600 hover:text-purple-700 font-medium"
                    >
                      Forgot password?
                    </a>
                  </div>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      required
                      className="w-full px-3 py-2 text-sm rounded-md border border-slate-300 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-600"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-medium cursor-pointer"
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>

                <div className="flex items-center">
                  <input
                    id="rememberMe"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-slate-300 text-purple-600 accent-purple-600 cursor-pointer"
                  />
                  <label htmlFor="rememberMe" className="ml-2 text-xs text-slate-600 cursor-pointer select-none">
                    Remember me on this device
                  </label>
                </div>

                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={isSubmitting}
                  className="w-full py-2.5 px-4 rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-semibold flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50"
                >
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
                  <span>Continue with Google</span>
                </button>

                <div className="relative flex items-center justify-center my-1.5">
                  <div className="border-t border-slate-200 w-full" />
                  <span className="bg-white px-3 text-xs text-slate-400 font-medium lowercase">
                    or
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 px-4 rounded-md text-white text-xs sm:text-sm font-bold uppercase tracking-wider cursor-pointer disabled:opacity-60 bg-gradient-to-r from-[#00b4d8] via-[#6366f1] via-[#8b5cf6] to-[#ec4899] hover:opacity-95"
                >
                  {isSubmitting ? 'Signing in...' : 'Sign In'}
                </button>
              </form>

              <div className="mt-4 pt-2.5 border-t border-slate-100 text-center text-xs text-slate-500">
                Don&apos;t have an account?{' '}
                <a href="#signup" className="text-purple-600 hover:text-purple-700 font-semibold">
                  Create account
                </a>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
