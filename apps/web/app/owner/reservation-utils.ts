export type ReservationStatus = "PENDING" | "CONFIRMED" | "CANCELLED";

export function getReservationStatusLabel(status: ReservationStatus): string {
    if (status === "PENDING") {
        return "قيد الانتظار";
    }

    if (status === "CONFIRMED") {
        return "مؤكد";
    }

    if (status === "CANCELLED") {
        return "ملغى";
    }

    return "ملغى";
}
