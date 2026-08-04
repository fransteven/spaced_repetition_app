// design-sync shim for `next/link`. No Next router exists in the design-tool
// runtime, so Link renders the anchor it would render in the app.
import * as React from 'react';

type Href = string | { pathname?: string; query?: Record<string, string> };

type LinkProps = Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & {
  href: Href;
  prefetch?: boolean;
  replace?: boolean;
  scroll?: boolean;
  shallow?: boolean;
  passHref?: boolean;
  legacyBehavior?: boolean;
};

const hrefToString = (href: Href): string =>
  typeof href === 'string' ? href : href?.pathname ?? '#';

const Link = React.forwardRef<HTMLAnchorElement, LinkProps>(function Link(props, ref) {
  const {
    href,
    prefetch: _prefetch,
    replace: _replace,
    scroll: _scroll,
    shallow: _shallow,
    passHref: _passHref,
    legacyBehavior: _legacyBehavior,
    children,
    ...rest
  } = props;
  return (
    <a {...rest} ref={ref} href={hrefToString(href)}>
      {children}
    </a>
  );
});

export default Link;
