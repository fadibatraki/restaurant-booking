import { redirect } from "next/navigation";

type PageProps = {
    searchParams?: Promise<{
        status?: string | string[];
    }>;
};

export default async function OwnerRestaurantReservationsPage({ searchParams }: PageProps) {
    // Build query string if status is provided
    const resolvedSearchParams = searchParams ? await searchParams : undefined;
    const status = resolvedSearchParams?.status;
    const query = status ? `?status=${Array.isArray(status) ? status[0] : status}` : "";

    // Redirect to main owner reservations page since we only support single restaurant
    redirect(`/owner/reservations${query}`);
}