import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign in — NeuroCards',
  description: 'Inicia sesión en tu cuenta de NeuroCards',
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
