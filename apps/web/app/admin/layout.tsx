import { AdminLayout } from "../_components/area-shells";

export default function AdminRouteLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return <AdminLayout>{children}</AdminLayout>;
}