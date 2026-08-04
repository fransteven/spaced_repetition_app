// design-sync shim for `next/navigation`. Components read the pathname to mark
// the active nav item; the design-tool runtime has no router, so this reports a
// stable pathname and no-op navigation.
// '/decks' rather than '/' so nav components show a real active state in
// previews (the dashboard route is '/', which matches nothing else).
export const DESIGN_PATHNAME = '/decks';

export function usePathname(): string {
  return DESIGN_PATHNAME;
}

type Router = {
  push: (href: string) => void;
  replace: (href: string) => void;
  back: () => void;
  forward: () => void;
  refresh: () => void;
  prefetch: (href: string) => void;
};

const noop = (): void => {};

export function useRouter(): Router {
  return { push: noop, replace: noop, back: noop, forward: noop, refresh: noop, prefetch: noop };
}

export function useSearchParams(): URLSearchParams {
  return new URLSearchParams();
}

export function useParams(): Record<string, string> {
  return {};
}

export function redirect(_href: string): void {}
export function notFound(): void {}
