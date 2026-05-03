import {
    AdminPageChrome,
    AdminRestaurantsSection,
    getAdminDashboardData,
} from "../admin-dashboard";

export default async function AdminRestaurantsPage() {
    const data = await getAdminDashboardData("/admin/restaurants");

    return (
        <AdminPageChrome
            currentView="restaurants"
            title="إدارة المطاعم"
            description="صفحة منفصلة لمراجعة سجلات المطاعم الحالية والملكية الإدارية بدون إبقاء القائمة الكاملة داخل /admin."
            data={data}
        >
            <AdminRestaurantsSection data={data} />
        </AdminPageChrome>
    );
}