import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';

export const metadata: Metadata = {
  title: 'Autenticación',
  description: 'Inicia sesión o crea una cuenta en NeuroCards.',
};

export default async function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): Promise<React.ReactNode> {
  const session = await auth();

  if (session?.user?.id) {
    redirect('/');
  }

  return children;
}
