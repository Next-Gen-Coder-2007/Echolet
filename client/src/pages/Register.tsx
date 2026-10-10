import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Logo from '../components/Logo';
import registerImg from '../assets/register.png';
import authService from '../services/authService';
import GoogleLoginButton from '../components/GoogleLoginButton';
import { useMessage } from '../context/MessageContext';

export default function Register() {
  const navigate = useNavigate();
  const { showSuccess, showError, showWarning } = useMessage();
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [birthday, setBirthday] = useState('');
  const [gender, setGender] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !username.trim() || !email.trim() || !birthday || !gender || !password.trim()) {
      showWarning('Please fill in all required fields.', 'Incomplete Form', 5000);
      return;
    }

    if (password !== confirmPassword) {
      showError('Passwords do not match. Please verify your password.', 'Password Mismatch', 5000);
      return;
    }

    if (!agreeTerms) {
      showWarning('Please accept the Terms & Conditions.', 'Terms Required', 5000);
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await authService.register({
        fullName: fullName.trim(),
        username: username.trim(),
        email: email.trim(),
        birthday,
        gender,
        password,
      });

      const successText = response.message || `Account created successfully! Welcome to Echolet, @${username}!`;
      showSuccess(successText, 'Successfully Registered', 5000);

      setTimeout(() => {
        navigate('/');
      }, 900);
    } catch (err: any) {
      const errorMsg =
        err.response?.data?.message || 'Registration failed. Please check your information.';
      showError(errorMsg, 'Registration Failed', 5000);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-800 flex flex-col relative overflow-hidden selection:bg-purple-600 selection:text-white">
      <div className="absolute -right-20 sm:-right-28 top-1/2 -translate-y-1/2 w-64 h-64 sm:w-84 sm:h-84 rounded-full bg-[#EC4899] pointer-events-none z-0" />
      <div className="absolute right-1/3 sm:right-[35%] top-10 sm:top-12 w-72 h-72 sm:w-96 sm:h-96 rounded-full bg-[#00A3FF] pointer-events-none z-0" />

      <header className="w-full max-w-7xl mx-auto px-6 pt-5 pb-2 flex items-center justify-between relative z-10">
        <Logo />
      </header>

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-center pt-6 pb-6 sm:pb-8 relative z-10">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center -translate-y-1 sm:-translate-y-3">
          <div className="lg:col-span-7 flex justify-center w-full order-2 lg:order-1">
            <div className="w-full max-w-[670px] sm:max-w-[700px] bg-white rounded-[28px] p-6 sm:p-7 border border-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.3)] hover:shadow-[0_16px_36px_rgba(0,0,0,0.4)] transition-all duration-300 ease-out">
              <div className="text-center mb-4 sm:mb-5">
                <h1 className="text-2xl sm:text-[28px] font-bold tracking-tight text-slate-900 leading-tight">
                  Create Account
                </h1>
                <p className="mt-1.5 text-xs sm:text-sm text-slate-500">
                  Join Echolet and start connecting today
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-3.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label
                      htmlFor="fullName"
                      className="block text-xs font-semibold text-slate-700 mb-1.5 ml-1"
                    >
                      Full Name
                    </label>
                    <input
                      id="fullName"
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="John Doe"
                      required
                      className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50/70 text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all duration-200"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="username"
                      className="block text-xs font-semibold text-slate-700 mb-1.5 ml-1"
                    >
                      Username
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-semibold select-none">
                        @
                      </span>
                      <input
                        id="username"
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                        placeholder="username"
                        required
                        className="w-full pl-8 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50/70 text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all duration-200"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 sm:gap-4">
                  <div className="sm:col-span-6">
                    <label
                      htmlFor="email"
                      className="block text-xs font-semibold text-slate-700 mb-1.5 ml-1"
                    >
                      Email Address
                    </label>
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@domain.com"
                      required
                      className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50/70 text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all duration-200"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <label
                      htmlFor="birthday"
                      className="block text-xs font-semibold text-slate-700 mb-1.5 ml-1"
                    >
                      Birthday
                    </label>
                    <input
                      id="birthday"
                      type="date"
                      value={birthday}
                      onChange={(e) => setBirthday(e.target.value)}
                      required
                      className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50/70 text-slate-800 focus:bg-white focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all duration-200"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <label
                      htmlFor="gender"
                      className="block text-xs font-semibold text-slate-700 mb-1.5 ml-1"
                    >
                      Gender
                    </label>
                    <div className="relative">
                      <select
                        id="gender"
                        value={gender}
                        onChange={(e) => setGender(e.target.value)}
                        required
                        className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50/70 text-slate-800 focus:bg-white focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all duration-200 cursor-pointer appearance-none"
                      >
                        <option value="" disabled>Select</option>
                        <option value="Female">Female</option>
                        <option value="Male">Male</option>
                        <option value="Other">Other</option>
                      </select>
                      <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                        <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label
                      htmlFor="password"
                      className="block text-xs font-semibold text-slate-700 mb-1.5 ml-1"
                    >
                      Password
                    </label>
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50/70 text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all duration-200"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="confirmPassword"
                      className="block text-xs font-semibold text-slate-700 mb-1.5 ml-1"
                    >
                      Confirm Password
                    </label>
                    <input
                      id="confirmPassword"
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50/70 text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all duration-200"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between ml-1 pt-1">
                  <div className="flex items-center">
                    <input
                      id="agreeTerms"
                      type="checkbox"
                      checked={agreeTerms}
                      onChange={(e) => setAgreeTerms(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 text-purple-600 accent-purple-600 cursor-pointer transition-colors duration-150"
                    />
                    <label htmlFor="agreeTerms" className="ml-2 text-xs text-slate-600 cursor-pointer select-none">
                      I agree to the{' '}
                      <a href="#terms" onClick={(e) => e.preventDefault()} className="text-purple-600 hover:underline font-medium">
                        Terms & Conditions
                      </a>
                    </label>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-slate-400 hover:text-purple-600 text-xs font-semibold cursor-pointer transition-colors duration-200"
                  >
                    {showPassword ? 'Hide password' : 'Show password'}
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 sm:py-3.5 px-4 rounded-xl text-white text-xs sm:text-sm font-bold uppercase tracking-wider cursor-pointer disabled:opacity-60 bg-gradient-to-r from-[#00b4d8] via-[#6366f1] via-[#8b5cf6] to-[#ec4899] hover:opacity-95 hover:shadow-lg hover:shadow-purple-500/25 hover:scale-[1.005] active:scale-[0.99] transition-all duration-200"
                >
                  {isSubmitting ? 'Creating Account...' : 'Create Account'}
                </button>

                <div className="flex items-center my-2 sm:my-2.5">
                  <div className="flex-1 h-px bg-slate-200 rounded-full" />
                  <span className="px-3.5 py-0.5 rounded-full bg-slate-100/80 text-[11px] uppercase tracking-wider text-slate-400 font-bold select-none mx-2">
                    or
                  </span>
                  <div className="flex-1 h-px bg-slate-200 rounded-full" />
                </div>

                <GoogleLoginButton text="Sign up with Google" disabled={isSubmitting} />
              </form>

              <div className="mt-4 pt-3 border-t border-slate-100 text-center text-xs sm:text-sm text-slate-500">
                Already have an account?{' '}
                <Link to="/login" className="text-purple-600 hover:text-purple-700 font-semibold transition-colors duration-200 hover:underline">
                  Sign in
                </Link>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 flex flex-col items-center justify-center order-1 lg:order-2">
            <div className="group w-full max-w-[440px] sm:max-w-[465px] bg-white rounded-[26px] p-3 sm:p-3.5 border border-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.2)] hover:shadow-[0_16px_36px_rgba(0,0,0,0.35)] transition-all duration-300 ease-out hover:-translate-y-1">
              <div className="overflow-hidden rounded-[20px] relative border border-slate-100">
                <img
                  src={registerImg}
                  alt="Echolet Community"
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
                  “Your journey begins here. Share your story, amplify your thoughts, and find your community.”
                </blockquote>
                <div className="mt-2 flex justify-center">
                  <span className="inline-block px-2.5 py-0.5 rounded-full bg-purple-50 text-[10px] font-semibold tracking-wider uppercase text-purple-600 border border-purple-100/60">
                    The Echolet Community
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}