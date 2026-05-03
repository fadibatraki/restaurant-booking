import {
    getOwnerDashboardData,
    OwnerPageChrome,
    OwnerReservationsHistorySection,
} from "../../owner-dashboard";
import { HistoryReservationsClient } from "./history-reservations.client";

export default async function OwnerReservationsHistoryPage() {
    const data = await getOwnerDashboardData("/owner/reservations/history");
    const restaurants = data.ownedRestaurants.map((restaurant) => ({
        id: restaurant.id,
        name: restaurant.name,
    }));

    return (
        <OwnerPageChrome
            currentView="reservations"
            title="سجل الحجوزات"
            description="تابع جميع الحجوزات غير المكتملة مع تصفية سهلة حسب الحالة."
            data={data}
        >
            <OwnerReservationsHistorySection data={data}>
                <HistoryReservationsClient restaurants={restaurants} />
            </OwnerReservationsHistorySection>
        </OwnerPageChrome>
    );
}
