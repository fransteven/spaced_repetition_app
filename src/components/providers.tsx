'use client';

import * as React from 'react';
import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { SessionProvider } from 'next-auth/react';

import { Toaster } from '@/components/ui/sonner';
import { ServiceWorkerRegister } from '@/components/service-worker-register';
import { OfflineSyncProvider } from '@/components/offline/offline-sync-provider';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <NextThemesProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        {children}
        <Toaster />
        <ServiceWorkerRegister />
        <OfflineSyncProvider />
      </NextThemesProvider>
    </SessionProvider>
  );
}
