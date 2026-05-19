import type { NextAuthConfig } from 'next-auth';
import { NextResponse } from 'next/server';

const AUTH_ROUTES = ['/login', '/register'];
const PROTECTED_ROUTE_PREFIXES = ['/', '/decks', '/study', '/reminders'];

function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_ROUTE_PREFIXES.some((route) => {
    if (route === '/') {
      return pathname === '/';
    }

    return pathname === route || pathname.startsWith(`${route}/`);
  });
}

function isAuthRoute(pathname: string): boolean {
  return AUTH_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

export const authConfig: NextAuthConfig = {
  providers: [],
  pages: {
    signIn: '/login',
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;

      if (isAuthRoute(nextUrl.pathname) && isLoggedIn) {
        return NextResponse.redirect(new URL('/', nextUrl));
      }

      if (isProtectedRoute(nextUrl.pathname)) {
        return isLoggedIn;
      }

      return true;
    },
    async jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    async session({ session, token }) {
      if (token.id) session.user.id = token.id as string;
      return session;
    },
  },
};
