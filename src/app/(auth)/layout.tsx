import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';

export const metadata: Metadata = {
  title: 'Authentication — NeuroCards',
  description: 'Sign in or create a NeuroCards account.',
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
