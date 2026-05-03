import { redirect } from "next/navigation";

type PageProps = {
    searchParams?: Promise<{
        status?: string | string[];
        view?: string | string[];
    }>;
};

export default async function OwnerPage({ searchParams }: PageProps) {
    const resolvedSearchParams = searchParams ? await searchParams : undefined;

    if (resolvedSearchParams?.status || resolvedSearchParams?.view) {
        const params = new URLSearchParams();
        const targetView =
            typeof resolvedSearchParams.view === "string" && resolvedSearchParams.view !== "dashboard"
                ? resolvedSearchParams.view
                : resolvedSearchParams.status
                    ? "reservations"
                    : "tables";

        if (typeof resolvedSearchParams.status === "string") {
            params.set("status", resolvedSearchParams.status);
        }

        const query = params.toString();
        const targetPath = targetView === "reservations" ? "/owner/reservations" : "/owner/tables";
        redirect(query ? `${targetPath}?${query}` : targetPath);
    }

    redirect("/owner/tables");
}
