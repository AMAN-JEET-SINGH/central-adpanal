import type { Metadata } from 'next';
import { AuthProvider } from '@/lib/authContext';
import './globals.css';

export const metadata: Metadata = {
  title: 'Adsense Admin Panel',
  description: 'Internal Adsense administration panel',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
