import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface AppLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
  href?: string;
}

const SIZE_MAP = {
  sm: { image: 28, text: 'text-base font-bold' },
  md: { image: 36, text: 'text-lg font-black' },
  lg: { image: 48, text: 'text-xl font-extrabold' },
};

export function AppLogo({
  size = 'md',
  showText = true,
  className,
  href,
}: AppLogoProps): React.JSX.Element {
  const { image: imageSize, text: textClass } = SIZE_MAP[size];

  const content = (
    <div className={cn('flex items-center gap-2.5 select-none', className)}>
      <Image
        src="/logo.png"
        alt="NeuroCards Logo"
        width={imageSize}
        height={imageSize}
        className="rounded-lg object-contain shadow-sm"
        priority
      />
      {showText && (
        <span className={cn('tracking-tight text-on-surface', textClass)}>
          NeuroCards
        </span>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="inline-flex items-center hover:opacity-95 transition-opacity">
        {content}
      </Link>
    );
  }

  return content;
}
