import {
    AdminPageChrome,
    AdminUsersSection,
    getAdminDashboardData,
} from "../admin-dashboard";

export default async function AdminUsersPage() {
    const data = await getAdminDashboardData("/admin/users");

    return (
        <AdminPageChrome
            currentView="users"
            title="إدارة المستخدمين"
            description="صفحة منفصلة لمراجعة حسابات المنصة وأدوارها وروابط المطاعم الحالية مع إبقاء /admin مختصراً."
            data={data}
        >
            <AdminUsersSection data={data} />
        </AdminPageChrome>
    );
}