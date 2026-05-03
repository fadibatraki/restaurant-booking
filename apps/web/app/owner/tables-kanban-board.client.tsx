"use client";

import { useState, useTransition } from "react";
import type { RestaurantTable, RestaurantReservation } from "./owner-dashboard";
import { TableManagementForm } from "./table-management-form";
import { TableDrawer } from "./table-drawer.client";
import { updateTableStatus } from "./table-actions";
import styles from "./page.module.css";

type TableStatus = "available" | "reserved" | "full";

type TableWithStatus = RestaurantTable & {
    status: TableStatus;
    nextReservation?: RestaurantReservation;
    upcomingReservations: RestaurantReservation[];
};

type TablesKanbanBoardProps = {
    restaurantId: string;
    availableTables: TableWithStatus[];
    reservedTables: TableWithStatus[];
    fullTables: TableWithStatus[];
};

function formatReservationDate(value: string) {
    return new Intl.DateTimeFormat("ar-SY-u-nu-latn", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
    }).format(new Date(value));
}

export function TablesKanbanBoard({
    restaurantId,
    availableTables,
    reservedTables,
    fullTables,
}: TablesKanbanBoardProps) {
    const [selectedTable, setSelectedTable] = useState<TableWithStatus | null>(null);
    const [isPending, startTransition] = useTransition();
    const [draggedTable, setDraggedTable] = useState<TableWithStatus | null>(null);
    const [dragOverColumn, setDragOverColumn] = useState<TableStatus | null>(null);

    const handleTableClick = (table: TableWithStatus) => {
        setSelectedTable(table);
    };

    const handleCloseDrawer = () => {
        setSelectedTable(null);
    };

    const handleDragStart = (e: React.DragEvent, table: TableWithStatus) => {
        setDraggedTable(table);
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", table.id);
    };

    const handleDragEnd = () => {
        setDraggedTable(null);
        setDragOverColumn(null);
    };

    const handleDragOver = (e: React.DragEvent, columnStatus: TableStatus) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        setDragOverColumn(columnStatus);
    };

    const handleDragLeave = () => {
        setDragOverColumn(null);
    };

    const handleDrop = async (e: React.DragEvent, targetStatus: TableStatus) => {
        e.preventDefault();
        setDragOverColumn(null);

        if (!draggedTable) return;

        // Convert UI status to backend status
        let backendStatus: "AVAILABLE" | "RESERVED" | "OCCUPIED";
        if (targetStatus === "available") {
            backendStatus = "AVAILABLE";
        } else if (targetStatus === "reserved") {
            backendStatus = "RESERVED";
        } else {
            backendStatus = "OCCUPIED";
        }

        // Only update if the status actually changed
        if (draggedTable.status !== targetStatus) {
            startTransition(async () => {
                await updateTableStatus(draggedTable.id, backendStatus);
            });
        }

        setDraggedTable(null);
    };

    return (
        <>
            {/* Drag Hint */}
            <div className={styles.kanbanDragHint}>
                <div className={styles.kanbanDragHintContent}>
                    <span className={styles.kanbanDragHintIcon}>✋</span>
                    <p className={styles.kanbanDragHintText}>
                        اسحب الطاولة بين الأعمدة لتغيير حالتها
                    </p>
                </div>
                <TableManagementForm restaurantId={restaurantId} />
            </div>

            <div className={styles.kanbanBoard}>
                {/* Available Tables Column - فارغة */}
                <div
                    className={`${styles.kanbanColumn} ${styles.kanbanColumnAvailable} ${dragOverColumn === "available" ? styles.dragOver : ""}`}
                    onDragOver={(e) => handleDragOver(e, "available")}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, "available")}
                >
                    <div className={styles.kanbanColumnHeader}>
                        <h4 className={styles.kanbanColumnTitle}>فارغة</h4>
                        <span className={styles.kanbanColumnCount}>{availableTables.length}</span>
                    </div>
                    <div className={styles.kanbanCards}>
                        {availableTables.length === 0 ? (
                            <div className={styles.kanbanEmptyState}>
                                <div className={styles.kanbanEmptyIcon}>◯</div>
                                <p className={styles.kanbanEmptyText}>لا توجد طاولات فارغة</p>
                            </div>
                        ) : (
                            availableTables.map((table) => (
                                <article
                                    key={table.id}
                                    className={`${styles.kanbanTableCard} ${draggedTable?.id === table.id ? styles.kanbanTableCardDragging : ""}`}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, table)}
                                    onDragEnd={handleDragEnd}
                                    onClick={() => handleTableClick(table)}
                                    role="button"
                                    tabIndex={0}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" || e.key === " ") {
                                            e.preventDefault();
                                            handleTableClick(table);
                                        }
                                    }}
                                >
                                    <div className={styles.kanbanTableHeader}>
                                        <h5 className={styles.kanbanTableName}>{table.name}</h5>
                                        <span className={styles.kanbanTableCapacity}>
                                            {table.capacity} ضيوف
                                        </span>
                                    </div>
                                    <span
                                        className={`${styles.kanbanTableStatus} ${styles.kanbanTableStatusAvailable}`}
                                    >
                                        فارغة
                                    </span>
                                    <p className={styles.kanbanTableId}>{table.id}</p>
                                </article>
                            ))
                        )}
                    </div>
                </div>

                {/* Reserved Tables Column - محجوزة */}
                <div
                    className={`${styles.kanbanColumn} ${styles.kanbanColumnReserved} ${dragOverColumn === "reserved" ? styles.dragOver : ""}`}
                    onDragOver={(e) => handleDragOver(e, "reserved")}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, "reserved")}
                >
                    <div className={styles.kanbanColumnHeader}>
                        <h4 className={styles.kanbanColumnTitle}>محجوزة</h4>
                        <span className={styles.kanbanColumnCount}>{reservedTables.length}</span>
                    </div>
                    <div className={styles.kanbanCards}>
                        {reservedTables.length === 0 ? (
                            <div className={styles.kanbanEmptyState}>
                                <div className={styles.kanbanEmptyIcon}>◯</div>
                                <p className={styles.kanbanEmptyText}>لا توجد طاولات محجوزة</p>
                            </div>
                        ) : (
                            reservedTables.map((table) => (
                                <article
                                    key={table.id}
                                    className={`${styles.kanbanTableCard} ${draggedTable?.id === table.id ? styles.kanbanTableCardDragging : ""}`}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, table)}
                                    onDragEnd={handleDragEnd}
                                    onClick={() => handleTableClick(table)}
                                    role="button"
                                    tabIndex={0}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" || e.key === " ") {
                                            e.preventDefault();
                                            handleTableClick(table);
                                        }
                                    }}
                                >
                                    <div className={styles.kanbanTableHeader}>
                                        <h5 className={styles.kanbanTableName}>{table.name}</h5>
                                        <span className={styles.kanbanTableCapacity}>
                                            {table.capacity} ضيوف
                                        </span>
                                    </div>
                                    <span
                                        className={`${styles.kanbanTableStatus} ${styles.kanbanTableStatusReserved}`}
                                    >
                                        محجوزة
                                    </span>
                                    {table.nextReservation && (
                                        <div className={styles.kanbanTableReservation}>
                                            <p className={styles.kanbanReservationLabel}>الحجز القادم</p>
                                            <p className={styles.kanbanReservationDate}>
                                                {formatReservationDate(table.nextReservation.reservationDate)}
                                            </p>
                                            <p className={styles.kanbanReservationGuests}>
                                                {table.nextReservation.guestsCount} ضيوف
                                            </p>
                                        </div>
                                    )}
                                    <p className={styles.kanbanTableId}>{table.id}</p>
                                </article>
                            ))
                        )}
                    </div>
                </div>

                {/* Full Tables Column - ممتلئة */}
                <div
                    className={`${styles.kanbanColumn} ${styles.kanbanColumnFull} ${dragOverColumn === "full" ? styles.dragOver : ""}`}
                    onDragOver={(e) => handleDragOver(e, "full")}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, "full")}
                >
                    <div className={styles.kanbanColumnHeader}>
                        <h4 className={styles.kanbanColumnTitle}>ممتلئة</h4>
                        <span className={styles.kanbanColumnCount}>{fullTables.length}</span>
                    </div>
                    <div className={styles.kanbanCards}>
                        {fullTables.length === 0 ? (
                            <div className={styles.kanbanEmptyState}>
                                <div className={styles.kanbanEmptyIcon}>◯</div>
                                <p className={styles.kanbanEmptyText}>لا توجد طاولات ممتلئة</p>
                            </div>
                        ) : (
                            fullTables.map((table) => (
                                <article
                                    key={table.id}
                                    className={`${styles.kanbanTableCard} ${draggedTable?.id === table.id ? styles.kanbanTableCardDragging : ""}`}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, table)}
                                    onDragEnd={handleDragEnd}
                                    onClick={() => handleTableClick(table)}
                                    role="button"
                                    tabIndex={0}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" || e.key === " ") {
                                            e.preventDefault();
                                            handleTableClick(table);
                                        }
                                    }}
                                >
                                    <div className={styles.kanbanTableHeader}>
                                        <h5 className={styles.kanbanTableName}>{table.name}</h5>
                                        <span className={styles.kanbanTableCapacity}>
                                            {table.capacity} ضيوف
                                        </span>
                                    </div>
                                    <span
                                        className={`${styles.kanbanTableStatus} ${styles.kanbanTableStatusFull}`}
                                    >
                                        ممتلئة
                                    </span>
                                    {table.nextReservation && (
                                        <div className={styles.kanbanTableReservation}>
                                            <p className={styles.kanbanReservationLabel}>الحجز القادم</p>
                                            <p className={styles.kanbanReservationDate}>
                                                {formatReservationDate(table.nextReservation.reservationDate)}
                                            </p>
                                            <p className={styles.kanbanReservationGuests}>
                                                {table.nextReservation.guestsCount} ضيوف
                                            </p>
                                        </div>
                                    )}
                                    <p className={styles.kanbanTableId}>{table.id}</p>
                                </article>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {isPending && (
                <div className={styles.kanbanLoadingOverlay}>
                    <p>جارٍ تحديث الطاولة...</p>
                </div>
            )}

            {/* Drawer */}
            <TableDrawer
                table={selectedTable}
                status={selectedTable?.status ?? "available"}
                nextReservation={selectedTable?.nextReservation}
                upcomingReservations={selectedTable?.upcomingReservations ?? []}
                onClose={handleCloseDrawer}
            />
        </>
    );
}
