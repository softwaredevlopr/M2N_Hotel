import AdminGuard from "@/components/admin/AdminGuard";

export default function AdminProtectedLayout({ children }) {
  return <AdminGuard>{children}</AdminGuard>;
}
