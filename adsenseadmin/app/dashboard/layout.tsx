import AdminNavbar from '@/components/AdminNavbar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminNavbar>{children}</AdminNavbar>;
}
