import {
    AdminPageChrome,
    AdminSummarySection,
    getAdminDashboardData,
} from "./admin-dashboard";

export default async function AdminPage() {
    const data = await getAdminDashboardData("/admin");

    return (
        <AdminPageChrome
            currentView="summary"
            title="ملخص المنصة"
            description="نظرة عامة على إدارة المنصة مع انتقال واضح إلى صفحات الدعوات والمطاعم والمستخدمين المنفصلة."
            data={data}
        >
            <AdminSummarySection data={data} />
        </AdminPageChrome>
    );
}