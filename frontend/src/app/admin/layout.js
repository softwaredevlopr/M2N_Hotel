import { BRAND_NAME } from "@/lib/brand";

export const metadata = {
  title: `Admin | ${BRAND_NAME}`,
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({ children }) {
  return children;
}
