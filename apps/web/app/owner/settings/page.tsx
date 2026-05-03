import {
    getOwnerDashboardData,
    OwnerPageChrome,
    OwnerSettingsSection,
} from "../owner-dashboard";

export default async function OwnerSettingsPage() {
    const data = await getOwnerDashboardData("/owner/settings");

    return (
        <OwnerPageChrome
            currentView="settings"
            title="معلومات المطعم"
            description="عرض بيانات المطعم الأساسية ضمن مساحة إدارة هادئة ومباشرة."
            data={data}
        >
            <OwnerSettingsSection data={data} />
        </OwnerPageChrome>
    );
}
