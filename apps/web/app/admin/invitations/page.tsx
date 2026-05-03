import {
    AdminInvitationsSection,
    AdminPageChrome,
    getAdminDashboardData,
} from "../admin-dashboard";

export default async function AdminInvitationsPage() {
    const data = await getAdminDashboardData("/admin/invitations");

    return (
        <AdminPageChrome
            currentView="invitations"
            title="إدارة الدعوات"
            description="صفحة مخصصة لإنشاء دعوات مديري المطاعم، متابعة حالاتها، ونسخ روابط القبول بدون مزجها مع بقية أقسام الإدارة."
            data={data}
        >
            <AdminInvitationsSection data={data} />
        </AdminPageChrome>
    );
}