import AdminNavbar from '@/components/AdminNavbar';

export default function ReportsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminNavbar>{children}</AdminNavbar>;
}
