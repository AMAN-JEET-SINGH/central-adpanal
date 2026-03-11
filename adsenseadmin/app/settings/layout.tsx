import AdminNavbar from '@/components/AdminNavbar';

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminNavbar>{children}</AdminNavbar>;
}
