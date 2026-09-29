import { Link } from 'react-router-dom';
import logoImg from '../assets/logo.png';

interface LogoProps {
  to?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function Logo({ to = '/', className = '', size = 'md' }: LogoProps) {
  const iconSize =
    size === 'sm' ? 'w-8 h-8' : size === 'lg' ? 'w-11 h-11' : 'w-9 h-9';
  const textSize =
    size === 'sm' ? 'text-xl' : size === 'lg' ? 'text-3xl' : 'text-2xl';

  return (
    <Link
      to={to}
      className={`inline-flex items-center gap-2.5 group transition-transform duration-200 hover:scale-[1.02] ${className}`}
    >
      <div className={`${iconSize} rounded-2xl bg-white shadow-xs border border-slate-100 flex items-center justify-center p-1.5 transition-all duration-300 group-hover:shadow-md group-hover:rotate-3`}>
        <img src={logoImg} alt="Echolet" className="w-full h-full object-contain" />
      </div>
      <span className={`${textSize} font-bold tracking-tight text-slate-900 select-none`}>
        Echo
        <span className="bg-gradient-to-r from-[#00b4d8] via-[#7928ca] to-[#ff0080] bg-clip-text text-transparent">
          let
        </span>
      </span>
    </Link>
  );
}
