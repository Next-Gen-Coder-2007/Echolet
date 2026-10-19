import { useState, useEffect } from 'react';

export interface AvatarProps {
  src?: string | null;
  name?: string | null;
  alt?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | 'full' | string;
  className?: string;
  imageClassName?: string;
  fallbackClassName?: string;
  textClassName?: string;
  icon?: React.ReactNode;
}

const SIZE_MAP: Record<string, { container: string; text: string }> = {
  xs: { container: 'w-6 h-6', text: 'text-[10px]' },
  sm: { container: 'w-8 h-8', text: 'text-xs' },
  md: { container: 'w-10 h-10', text: 'text-sm' },
  lg: { container: 'w-11 h-11', text: 'text-sm' },
  xl: { container: 'w-14 h-14', text: 'text-base font-bold' },
  '2xl': { container: 'w-16 h-16', text: 'text-lg font-bold' },
  '3xl': { container: 'w-24 h-24 sm:w-28 sm:h-28', text: 'text-2xl sm:text-3xl font-extrabold' },
  full: { container: 'w-full h-full', text: 'text-base font-bold' },
};

export default function Avatar({
  src,
  name,
  alt = '',
  size = 'md',
  className = '',
  imageClassName = '',
  fallbackClassName = '',
  textClassName = '',
  icon,
}: AvatarProps) {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [src]);

  // Extract clean uppercase initial
  const cleanName = (name || '').trim();
  const initialLetter = cleanName ? cleanName[0].toUpperCase() : 'U';

  const sizeConfig = SIZE_MAP[size] || {
    container: size.startsWith('w-') ? size : 'w-10 h-10',
    text: 'text-xs font-bold',
  };

  const isImageValid = Boolean(
    src &&
      !hasError &&
      typeof src === 'string' &&
      src.trim() !== '' &&
      src !== 'null' &&
      src !== 'undefined'
  );

  return (
    <div
      role="img"
      aria-label={cleanName || 'Avatar'}
      className={`relative inline-flex items-center justify-center shrink-0 rounded-full overflow-hidden select-none ${
        sizeConfig.container
      } ${className}`}
    >
      {isImageValid ? (
        <img
          src={src!}
          alt={alt}
          onError={() => setHasError(true)}
          className={`w-full h-full object-cover rounded-full ${imageClassName}`}
          loading="lazy"
        />
      ) : (
        <div
          className={`w-full h-full rounded-full flex items-center justify-center font-bold bg-gradient-to-tr from-purple-600 to-indigo-600 text-white shadow-2xs ${
            sizeConfig.text
          } ${fallbackClassName}`}
        >
          {icon ? icon : <span className={textClassName}>{initialLetter}</span>}
        </div>
      )}
    </div>
  );
}
