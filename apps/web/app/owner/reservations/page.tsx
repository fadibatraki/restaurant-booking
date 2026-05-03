import {
    getOwnerDashboardData,
    isReservationStatus,
    OwnerPageChrome,
    OwnerReservationsSection,
} from "../owner-dashboard";

type PageProps = {
    searchParams?: Promise<{
        status?: string | string[];
    }>;
};

export default async function OwnerReservationsPage({ searchParams }: PageProps) {
    const resolvedSearchParams = searchParams ? await searchParams : undefined;
    const selectedStatus = isReservationStatus(resolvedSearchParams?.status)
        ? resolvedSearchParams.status
        : undefined;
    const data = await getOwnerDashboardData("/owner/reservations");

    return (
        <OwnerPageChrome
            currentView="reservations"
            title="إدارة الحجوزات"
            description="إدارة الحجوزات  التأكيد أو  عند الحاجة."
            data={data}
        >
            <OwnerReservationsSection data={data} selectedStatus={selectedStatus} />
        </OwnerPageChrome>
    );
}