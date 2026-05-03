import { redirect } from "next/navigation";

export default async function OwnerRestaurantPage() {
    // Redirect to main owner page since we only support single restaurant
    redirect("/owner");
}