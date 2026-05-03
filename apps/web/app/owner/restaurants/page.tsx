import { redirect } from "next/navigation";

export default async function OwnerRestaurantsPage() {
    // Redirect to main owner page since we only support single restaurant
    redirect("/owner");
}