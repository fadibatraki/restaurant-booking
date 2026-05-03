import { redirect } from "next/navigation";

export default async function OwnerRestaurantTablesPage() {
    // Redirect to main owner tables page since we only support single restaurant
    redirect("/owner/tables");
}