import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  NotificationType,
  ReservationStatus,
  TableStatus,
} from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { FindRestaurantAvailabilityDto } from './dto/find-restaurant-availability.dto';
import { FindRestaurantReservationsDto } from './dto/find-restaurant-reservations.dto';
import { FindRestaurantsDto } from './dto/find-restaurants.dto';

@Injectable()
export class RestaurantsService {
  constructor(private readonly prisma: PrismaService) {}

  private async findOwnedRestaurant(restaurantId: string, userId: string) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: {
        id: true,
        ownerId: true,
        name: true,
      },
    });

    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }

    if (restaurant.ownerId !== userId) {
      throw new ForbiddenException('You do not own this restaurant');
    }

    return restaurant;
  }

  private readonly safeRestaurantSelect = {
    id: true,
    name: true,
    description: true,
    address: true,
    phone: true,
    image: true,
    openTime: true,
    closeTime: true,
    ownerId: true,
    createdAt: true,
  } as const;

  private readonly safeTableSelect = {
    id: true,
    name: true,
    capacity: true,
    isActive: true,
    restaurantId: true,
    createdAt: true,
  } as const;

  private readonly safeReservationSelect = {
    id: true,
    userId: true,
    restaurantId: true,
    tableId: true,
    reservationDate: true,
    guestsCount: true,
    notes: true,
    status: true,
    createdAt: true,
  } as const;

  async findAll(query: FindRestaurantsDto) {
    return this.prisma.restaurant.findMany({
      where: query.q
        ? {
            OR: [
              {
                name: {
                  contains: query.q,
                  mode: 'insensitive',
                },
              },
              {
                address: {
                  contains: query.q,
                  mode: 'insensitive',
                },
              },
            ],
          }
        : undefined,
      orderBy: {
        createdAt: 'desc',
      },
      select: this.safeRestaurantSelect,
    });
  }

  async findOne(id: string) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id },
      select: this.safeRestaurantSelect,
    });

    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }

    return restaurant;
  }

  async findTables(restaurantId: string) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { id: true },
    });

    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }

    return this.prisma.table.findMany({
      where: { restaurantId },
      select: this.safeTableSelect,
    });
  }

  async findAvailability(
    restaurantId: string,
    query: FindRestaurantAvailabilityDto,
  ) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { id: true },
    });

    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }

    const reservationDate = new Date(query.date);
    const [tables, blockingReservations] = await Promise.all([
      this.prisma.table.findMany({
        where: {
          restaurantId,
          capacity: query.guestsCount
            ? {
                gte: query.guestsCount,
              }
            : undefined,
        },
        select: this.safeTableSelect,
      }),
      this.prisma.reservation.findMany({
        where: {
          restaurantId,
          reservationDate,
          status: {
            in: [ReservationStatus.PENDING, ReservationStatus.CONFIRMED],
          },
        },
        select: {
          tableId: true,
        },
      }),
    ]);

    const unavailableTableIds = new Set(
      blockingReservations.map((reservation) => reservation.tableId),
    );

    return tables.map((table) => ({
      ...table,
      isAvailable: !unavailableTableIds.has(table.id),
    }));
  }

  async findReservations(
    restaurantId: string,
    userId: string,
    query: FindRestaurantReservationsDto,
  ) {
    await this.findOwnedRestaurant(restaurantId, userId);

    const statusFilter = query.status
      ? query.status
      : {
          in: [ReservationStatus.PENDING, ReservationStatus.CONFIRMED],
        };

    return this.prisma.reservation.findMany({
      where: {
        restaurantId,
        status: statusFilter,
      },
      orderBy: {
        reservationDate: 'asc',
      },
      select: this.safeReservationSelect,
    });
  }

  async confirmReservation(
    restaurantId: string,
    reservationId: string,
    userId: string,
  ) {
    const restaurant = await this.findOwnedRestaurant(restaurantId, userId);

    const reservation = await this.prisma.reservation.findUnique({
      where: { id: reservationId },
      select: {
        id: true,
        userId: true,
        restaurantId: true,
        status: true,
      },
    });

    if (!reservation) {
      throw new NotFoundException('Reservation not found');
    }

    if (reservation.restaurantId !== restaurantId) {
      throw new BadRequestException(
        'Reservation does not belong to this restaurant',
      );
    }

    if (reservation.status !== ReservationStatus.PENDING) {
      throw new BadRequestException(
        'Only pending reservations can be confirmed',
      );
    }

    return this.prisma.$transaction(async (transaction) => {
      const updatedReservation = await transaction.reservation.update({
        where: { id: reservationId },
        data: {
          status: ReservationStatus.CONFIRMED,
        },
        select: this.safeReservationSelect,
      });

      await transaction.notification.create({
        data: {
          type: NotificationType.RESERVATION_CONFIRMED_BY_OWNER,
          title: 'تمت الموافقة على حجزك',
          body: `تمت الموافقة على حجزك في مطعم ${restaurant.name}.`,
          recipientUserId: reservation.userId,
          actorUserId: userId,
          reservationId: reservation.id,
          restaurantId,
        },
      });

      return updatedReservation;
    });
  }

  async completeReservation(
    restaurantId: string,
    reservationId: string,
    userId: string,
  ) {
    const restaurant = await this.findOwnedRestaurant(restaurantId, userId);

    const reservation = await this.prisma.reservation.findUnique({
      where: { id: reservationId },
      select: {
        id: true,
        userId: true,
        restaurantId: true,
        status: true,
      },
    });

    if (!reservation) {
      throw new NotFoundException('Reservation not found');
    }

    if (reservation.restaurantId !== restaurantId) {
      throw new BadRequestException(
        'Reservation does not belong to this restaurant',
      );
    }

    if (reservation.status !== ReservationStatus.CONFIRMED) {
      throw new BadRequestException(
        'Only confirmed reservations can be completed',
      );
    }

    return this.prisma.$transaction(async (transaction) => {
      const updatedReservation = await transaction.reservation.update({
        where: { id: reservationId },
        data: {
          status: ReservationStatus.COMPLETED,
        },
        select: this.safeReservationSelect,
      });

      await transaction.notification.create({
        data: {
          type: NotificationType.RESERVATION_COMPLETED_BY_OWNER,
          title: 'اكتمل حجزك',
          body: `تم تحديث حجزك إلى مكتمل في مطعم ${restaurant.name}.`,
          recipientUserId: reservation.userId,
          actorUserId: userId,
          reservationId: reservation.id,
          restaurantId,
        },
      });

      return updatedReservation;
    });
  }

  async rejectReservation(
    restaurantId: string,
    reservationId: string,
    userId: string,
  ) {
    const restaurant = await this.findOwnedRestaurant(restaurantId, userId);

    const reservation = await this.prisma.reservation.findUnique({
      where: { id: reservationId },
      select: {
        id: true,
        userId: true,
        restaurantId: true,
        tableId: true,
        status: true,
      },
    });

    if (!reservation) {
      throw new NotFoundException('Reservation not found');
    }

    if (reservation.restaurantId !== restaurantId) {
      throw new BadRequestException(
        'Reservation does not belong to this restaurant',
      );
    }

    if (reservation.status !== ReservationStatus.PENDING) {
      throw new BadRequestException(
        'Only pending reservations can be rejected',
      );
    }

    return this.prisma.$transaction(async (transaction) => {
      const updatedReservation = await transaction.reservation.update({
        where: { id: reservationId },
        data: {
          status: ReservationStatus.CANCELLED,
        },
        select: this.safeReservationSelect,
      });

      await transaction.notification.create({
        data: {
          type: NotificationType.RESERVATION_REJECTED_BY_OWNER,
          title: 'تم رفض الحجز',
          body: `تم رفض حجزك في مطعم ${restaurant.name}.`,
          recipientUserId: reservation.userId,
          actorUserId: userId,
          reservationId: reservation.id,
          restaurantId,
        },
      });

      const remainingActiveReservations = await transaction.reservation.count({
        where: {
          tableId: reservation.tableId,
          status: {
            in: [ReservationStatus.PENDING, ReservationStatus.CONFIRMED],
          },
        },
      });

      if (remainingActiveReservations === 0) {
        await transaction.table.update({
          where: { id: reservation.tableId },
          data: { status: TableStatus.AVAILABLE },
        });
      }

      return updatedReservation;
    });
  }

  async cancelReservation(
    restaurantId: string,
    reservationId: string,
    userId: string,
  ) {
    const restaurant = await this.findOwnedRestaurant(restaurantId, userId);

    const reservation = await this.prisma.reservation.findUnique({
      where: { id: reservationId },
      select: {
        id: true,
        userId: true,
        restaurantId: true,
        tableId: true,
        status: true,
      },
    });

    if (!reservation) {
      throw new NotFoundException('Reservation not found');
    }

    if (reservation.restaurantId !== restaurantId) {
      throw new BadRequestException(
        'Reservation does not belong to this restaurant',
      );
    }

    if (reservation.status !== ReservationStatus.CONFIRMED) {
      throw new BadRequestException(
        'Only confirmed reservations can be cancelled',
      );
    }

    return this.prisma.$transaction(async (transaction) => {
      const updatedReservation = await transaction.reservation.update({
        where: { id: reservationId },
        data: {
          status: ReservationStatus.CANCELLED,
        },
        select: this.safeReservationSelect,
      });

      await transaction.notification.create({
        data: {
          type: NotificationType.RESERVATION_CANCELLED_BY_OWNER,
          title: 'تم إلغاء الحجز من المطعم',
          body: `تم إلغاء حجزك في مطعم ${restaurant.name}.`,
          recipientUserId: reservation.userId,
          actorUserId: userId,
          reservationId: reservation.id,
          restaurantId,
        },
      });

      const remainingActiveReservations = await transaction.reservation.count({
        where: {
          tableId: reservation.tableId,
          status: {
            in: [ReservationStatus.PENDING, ReservationStatus.CONFIRMED],
          },
        },
      });

      if (remainingActiveReservations === 0) {
        await transaction.table.update({
          where: { id: reservation.tableId },
          data: { status: TableStatus.AVAILABLE },
        });
      }

      return updatedReservation;
    });
  }

  async deleteReservation(
    restaurantId: string,
    reservationId: string,
    userId: string,
  ) {
    await this.findOwnedRestaurant(restaurantId, userId);

    const reservation = await this.prisma.reservation.findUnique({
      where: { id: reservationId },
      select: {
        id: true,
        restaurantId: true,
        tableId: true,
      },
    });

    if (!reservation) {
      throw new NotFoundException('Reservation not found');
    }

    if (reservation.restaurantId !== restaurantId) {
      throw new BadRequestException(
        'Reservation does not belong to this restaurant',
      );
    }

    return this.prisma.$transaction(async (transaction) => {
      await transaction.reservation.delete({
        where: { id: reservationId },
      });

      const remainingActiveReservations = await transaction.reservation.count({
        where: {
          tableId: reservation.tableId,
          status: {
            in: [ReservationStatus.PENDING, ReservationStatus.CONFIRMED],
          },
        },
      });

      if (remainingActiveReservations === 0) {
        await transaction.table.update({
          where: { id: reservation.tableId },
          data: { status: TableStatus.AVAILABLE },
        });
      }

      return { success: true };
    });
  }

  async create(data: CreateRestaurantDto) {
    return this.prisma.restaurant.create({
      data,
      select: this.safeRestaurantSelect,
    });
  }
}
