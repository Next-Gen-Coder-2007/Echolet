import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Logo from '../components/Logo';
import authImg from '../assets/auth.png';
import authService from '../services/authService';
import { useMessage } from '../context/MessageContext';

export default function Login() {
  const navigate = useNavigate();
  const { showSuccess, showError, showWarning, showInfo } = useMessage();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      showWarning('Please enter your username and password.', 'Missing Fields');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await authService.login({
        username: username.trim(),
        password: password.trim(),
        rememberMe,
      });

      const welcomeText = response.message || `Signed in successfully. Welcome back, ${response.user?.fullName || username}!`;
      showSuccess(welcomeText, 'Successfully Logged In', 5000);

      setTimeout(() => {
        navigate('/');
      }, 700);
    } catch (err: any) {
      const errorMsg =
        err.response?.data?.message || 'Login failed. Please check your username and password.';
      showError(errorMsg, 'Login Failed', 5000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      showSuccess('Google authentication connected successfully.', 'Successfully Signed In', 5000);
    }, 400);
  };

  return (
    <div className="min-h-screen bg-white text-slate-800 flex flex-col relative overflow-hidden selection:bg-purple-600 selection:text-white">
      <div className="absolute -left-20 sm:-left-28 top-1/2 -translate-y-1/2 w-64 h-64 sm:w-84 sm:h-84 rounded-full bg-[#00A3FF] pointer-events-none z-0" />
      <div className="absolute left-1/3 sm:left-[35%] top-10 sm:top-12 w-72 h-72 sm:w-96 sm:h-96 rounded-full bg-[#8B5CF6] pointer-events-none z-0" />

      <header className="w-full max-w-7xl mx-auto px-6 pt-5 pb-2 flex items-center justify-between relative z-10">
        <Logo />
      </header>

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-center pt-9 pb-4 sm:pb-8 relative z-10">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center -translate-y-2 sm:-translate-y-5">
          <div className="lg:col-span-7 flex flex-col items-center justify-center">
            <div className="group w-full max-w-[440px] sm:max-w-[465px] bg-white rounded-[26px] p-3 sm:p-3.5 border border-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.2)] hover:shadow-[0_16px_36px_rgba(0,0,0,0.35)] transition-all duration-300 ease-out hover:-translate-y-1">
              <div className="overflow-hidden rounded-[20px] relative border border-slate-100">
                <img
                  src={authImg}
                  alt="Authentication"
                  className="w-full aspect-[4/3] object-cover block rounded-[20px] transition-transform duration-700 ease-out group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/35 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-[20px]" />
              </div>

              <div className="pt-3 pb-1 px-3 text-center">
                <div className="flex justify-center mb-1.5">
                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-purple-50 text-purple-600 transition-transform duration-300 group-hover:scale-110 shadow-xs">
                    <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                      <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                    </svg>
                  </span>
                </div>
                <blockquote className="text-slate-700 font-medium italic text-xs sm:text-sm leading-relaxed">
                  “Connect seamlessly, communicate effortlessly. Where every voice finds its echo.”
                </blockquote>
                <div className="mt-2 flex justify-center">
                  <span className="inline-block px-2.5 py-0.5 rounded-full bg-purple-50 text-[10px] font-semibold tracking-wider uppercase text-purple-600 border border-purple-100/60">
                    The Echolet Community
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 flex justify-center w-full">
            <div className="w-full max-w-[430px] sm:max-w-[445px] bg-white rounded-[28px] p-7 sm:p-8 border border-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.3)] hover:shadow-[0_16px_36px_rgba(0,0,0,0.4)] transition-all duration-300 ease-out">
              <div className="text-center mb-6">
                <h1 className="text-2xl sm:text-[28px] font-bold tracking-tight text-slate-900">
                  Welcome Back
                </h1>
                <p className="mt-1.5 text-xs sm:text-sm text-slate-500">
                  Please sign in to your Echolet account
                </p>
              </div>


              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="username"
                    className="block text-xs font-semibold text-slate-700 mb-1.5 ml-1"
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
                    className="w-full px-4 py-2.5 sm:py-3 text-sm rounded-2xl border border-slate-200 bg-slate-50/70 text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all duration-200"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5 ml-1">
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
                        showInfo('Password reset instructions have been sent to your registered email address.', 'Reset Link Sent', 5000);
                      }}
                      className="text-xs text-purple-600 hover:text-purple-700 font-medium transition-colors duration-200 hover:underline"
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
                      className="w-full px-4 py-2.5 sm:py-3 pr-14 text-sm rounded-2xl border border-slate-200 bg-slate-50/70 text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all duration-200"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-purple-600 text-xs font-semibold px-1.5 py-0.5 rounded-lg cursor-pointer transition-colors duration-200"
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>

                <div className="flex items-center py-0.5 ml-1">
                  <input
                    id="rememberMe"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded-md border-slate-300 text-purple-600 accent-purple-600 cursor-pointer transition-colors duration-150"
                  />
                  <label htmlFor="rememberMe" className="ml-2.5 text-xs text-slate-600 cursor-pointer select-none">
                    Remember me on this device
                  </label>
                </div>

                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={isSubmitting}
                  className="w-full py-2.5 sm:py-3 px-4 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-700 text-xs sm:text-sm font-semibold flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50 transition-all duration-200 shadow-xs hover:shadow-md active:scale-[0.99]"
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

                <div className="flex items-center my-3 sm:my-3.5">
                  <div className="flex-1 h-px bg-slate-200 rounded-full" />
                  <span className="px-3.5 py-0.5 rounded-full bg-slate-100/80 text-[11px] uppercase tracking-wider text-slate-400 font-bold select-none mx-2">
                    or
                  </span>
                  <div className="flex-1 h-px bg-slate-200 rounded-full" />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 sm:py-3.5 px-4 rounded-2xl text-white text-xs sm:text-sm font-bold uppercase tracking-wider cursor-pointer disabled:opacity-60 bg-gradient-to-r from-[#00b4d8] via-[#6366f1] via-[#8b5cf6] to-[#ec4899] hover:opacity-95 hover:shadow-lg hover:shadow-purple-500/25 hover:scale-[1.01] active:scale-[0.99] transition-all duration-200"
                >
                  {isSubmitting ? 'Signing in...' : 'Sign In'}
                </button>
              </form>

              <div className="mt-5 pt-3.5 border-t border-slate-100 text-center text-xs sm:text-sm text-slate-500">
                Don&apos;t have an account?{' '}
                <Link to="/register" className="text-purple-600 hover:text-purple-700 font-semibold transition-colors duration-200 hover:underline">
                  Create account
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
