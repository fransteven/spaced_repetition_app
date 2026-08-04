// design-sync shim for `next/image`.
// The design-tool bundle has no Next.js image pipeline and no /public server,
// so Image degrades to a plain <img>. App-served paths that the DS components
// reference are mapped to the repo's inlined SVG mark (public/logo.png is 5 MB
// — too large to inline; logo.svg is the same artwork).
import * as React from 'react';
// esbuild inlines this as a data: URI (loader: .svg -> dataurl).
import logoDataUri from '../../public/logo.svg';

const PUBLIC_MAP: Record<string, string> = {
  '/logo.png': logoDataUri as unknown as string,
  '/logo.svg': logoDataUri as unknown as string,
  '/icon.png': logoDataUri as unknown as string,
  '/icon.svg': logoDataUri as unknown as string,
};

type ImgProps = React.ImgHTMLAttributes<HTMLImageElement> & {
  src: string | { src: string };
  width?: number | string;
  height?: number | string;
  priority?: boolean;
  fill?: boolean;
  quality?: number;
  placeholder?: string;
  blurDataURL?: string;
  unoptimized?: boolean;
  loader?: unknown;
};

export default function Image(props: ImgProps): React.JSX.Element {
  const {
    src,
    alt = '',
    width,
    height,
    style,
    priority: _priority,
    fill,
    quality: _quality,
    placeholder: _placeholder,
    blurDataURL: _blur,
    unoptimized: _unoptimized,
    loader: _loader,
    ...rest
  } = props;
  const raw = typeof src === 'string' ? src : src?.src ?? '';
  const resolved = PUBLIC_MAP[raw] ?? raw;
  const fillStyle: React.CSSProperties | undefined = fill
    ? { position: 'absolute', inset: 0, width: '100%', height: '100%', ...style }
    : style;
  return (
    <img
      {...rest}
      src={resolved}
      alt={alt}
      width={fill ? undefined : width}
      height={fill ? undefined : height}
      style={fillStyle}
    />
  );
}
