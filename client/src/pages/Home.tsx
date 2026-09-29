import { Link } from 'react-router-dom';
import logoImg from '../assets/logo.png';

export default function Home() {
  return (
    <div className="min-h-screen bg-white text-slate-800 flex flex-col justify-between selection:bg-purple-600 selection:text-white">
      <header className="w-full max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5">
          <img src={logoImg} alt="Echolet" className="w-9 h-9 object-contain" />
          <span className="text-2xl font-bold tracking-tight text-slate-900">
            Echo<span className="bg-gradient-to-r from-[#00b4d8] via-[#7928ca] to-[#ff0080] bg-clip-text text-transparent">let</span>
          </span>
        </Link>

        <Link
          to="/login"
          className="px-4 py-2 rounded-md text-xs sm:text-sm font-semibold text-white bg-gradient-to-r from-[#00b4d8] via-[#6366f1] via-[#8b5cf6] to-[#ec4899] hover:opacity-95"
        >
          Sign In
        </Link>
      </header>

      <main className="flex-1 w-full max-w-4xl mx-auto px-6 flex flex-col items-center justify-center text-center py-10">
        <img src={logoImg} alt="Echolet" className="w-24 h-24 object-contain mb-6" />

        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900 mb-4">
          Welcome to{' '}
          <span className="bg-gradient-to-r from-[#00b4d8] via-[#7928ca] to-[#ff0080] bg-clip-text text-transparent">
            Echolet
          </span>
        </h1>

        <p className="max-w-xl text-base sm:text-lg text-slate-600 mb-8 leading-relaxed">
          A new way to connect, share, and be heard. Real-time conversations with beautiful simplicity.
        </p>

        <div className="flex items-center gap-4">
          <Link
            to="/login"
            style={{
              boxShadow: 'rgba(0, 0, 0, 0.16) 0px 3px 6px, rgba(0, 0, 0, 0.23) 0px 3px 6px',
            }}
            className="px-7 py-3 rounded-md text-sm font-bold text-white bg-gradient-to-r from-[#00b4d8] via-[#6366f1] via-[#8b5cf6] to-[#ec4899] hover:opacity-95"
          >
            Go to Login
          </Link>
        </div>
      </main>
    </div>
  );
}
