import { OwnerLayout } from "../_components/area-shells";

export default function OwnerRouteLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return <OwnerLayout>{children}</OwnerLayout>;
}