import {
    getOwnerDashboardData,
    OwnerPageChrome,
    OwnerTablesSection,
} from "../owner-dashboard";

export default async function OwnerTablesPage() {
    const data = await getOwnerDashboardData("/owner/tables");

    return (
        <OwnerPageChrome
            currentView="tables"
            title="إدارة الطاولات"
            description="إدارة الطاولات أصبحت في عرض مخصص يحافظ على إنشاء الطاولات والقائمة الحالية بدون إبقائها داخل صفحة الملخص الرئيسية."
            data={data}
        >
            <OwnerTablesSection data={data} />
        </OwnerPageChrome>
    );
}