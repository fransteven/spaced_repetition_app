import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { DashboardShell } from '@/components/layout/dashboard-shell';

export const metadata: Metadata = {
  title: 'Dashboard — NeuroCards',
  description: 'Your NeuroCards study dashboard.',
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}): Promise<React.ReactNode> {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login');
  }

  return <DashboardShell>{children}</DashboardShell>;
}
