import {
  BadRequestException,
  ConflictException,
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
import { CreateReservationDto } from './dto/create-reservation.dto';

@Injectable()
export class ReservationsService {
  constructor(private readonly prisma: PrismaService) {}

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

  async findAll() {
    return this.prisma.reservation.findMany({
      select: this.safeReservationSelect,
    });
  }

  async findMine(userId: string) {
    return this.prisma.reservation.findMany({
      where: { userId },
      orderBy: { reservationDate: 'asc' },
      select: this.safeReservationSelect,
    });
  }

  async findOne(id: string, userId: string) {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id },
      select: this.safeReservationSelect,
    });

    if (!reservation) {
      throw new NotFoundException('Reservation not found');
    }

    if (reservation.userId !== userId) {
      throw new ForbiddenException('You cannot view this reservation');
    }

    return reservation;
  }

  async create(data: CreateReservationDto, userId: string) {
    const reservationDate = new Date(data.reservationDate);

    if (reservationDate < new Date()) {
      throw new BadRequestException('Reservation date cannot be in the past');
    }

    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: data.restaurantId },
      select: {
        id: true,
        name: true,
        ownerId: true,
      },
    });

    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }

    const table = await this.prisma.table.findUnique({
      where: { id: data.tableId },
      select: {
        id: true,
        capacity: true,
        isActive: true,
        status: true,
        restaurantId: true,
      },
    });

    if (!table) {
      throw new NotFoundException('Table not found');
    }

    if (table.restaurantId !== data.restaurantId) {
      throw new BadRequestException(
        'Table does not belong to the given restaurant',
      );
    }

    if (!table.isActive) {
      throw new BadRequestException('Selected table is not active');
    }

    if (data.guestsCount > table.capacity) {
      throw new BadRequestException('Guests count exceeds table capacity');
    }

    const conflictingReservation = await this.prisma.reservation.findFirst({
      where: {
        tableId: data.tableId,
        reservationDate,
        status: {
          in: [ReservationStatus.PENDING, ReservationStatus.CONFIRMED],
        },
      },
      select: { id: true },
    });

    if (conflictingReservation) {
      throw new ConflictException(
        'A reservation already exists for this table at the selected time',
      );
    }

    return this.prisma.$transaction(async (transaction) => {
      const reservation = await transaction.reservation.create({
        data: {
          userId,
          restaurantId: data.restaurantId,
          tableId: data.tableId,
          reservationDate,
          guestsCount: data.guestsCount,
          notes: data.notes,
        },
        select: this.safeReservationSelect,
      });

      if (table.status === TableStatus.AVAILABLE) {
        await transaction.table.update({
          where: { id: data.tableId },
          data: { status: TableStatus.RESERVED },
        });
      }

      await transaction.notification.create({
        data: {
          type: NotificationType.RESERVATION_CREATED,
          title: 'حجز جديد',
          body: `لديك طلب حجز جديد في مطعم ${restaurant.name}.`,
          recipientUserId: restaurant.ownerId,
          actorUserId: userId,
          reservationId: reservation.id,
          restaurantId: restaurant.id,
        },
      });

      return reservation;
    });
  }

  async cancel(id: string, userId: string) {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id },
      select: this.safeReservationSelect,
    });

    if (!reservation) {
      throw new NotFoundException('Reservation not found');
    }

    if (reservation.userId !== userId) {
      throw new ForbiddenException('You cannot cancel this reservation');
    }

    if (reservation.status === ReservationStatus.CANCELLED) {
      throw new BadRequestException('Reservation is already cancelled');
    }

    if (
      reservation.status !== ReservationStatus.PENDING &&
      reservation.status !== ReservationStatus.CONFIRMED
    ) {
      throw new BadRequestException(
        'Only pending or confirmed reservations can be cancelled',
      );
    }

    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: reservation.restaurantId },
      select: {
        id: true,
        name: true,
        ownerId: true,
      },
    });

    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }

    return this.prisma.$transaction(async (transaction) => {
      await transaction.notification.create({
        data: {
          type: NotificationType.RESERVATION_CANCELLED_BY_CUSTOMER,
          title: 'إلغاء حجز من الزبون',
          body: `قام الزبون بإلغاء حجز في مطعم ${restaurant.name}.`,
          recipientUserId: restaurant.ownerId,
          actorUserId: userId,
          reservationId: reservation.id,
          restaurantId: restaurant.id,
        },
      });

      const deletedReservation = await transaction.reservation.delete({
        where: { id },
        select: this.safeReservationSelect,
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

      return deletedReservation;
    });
  }

  async updateNotes(id: string, userId: string, notes: string) {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
      },
    });

    if (!reservation) {
      throw new NotFoundException('Reservation not found');
    }

    if (reservation.userId !== userId) {
      throw new ForbiddenException('You cannot update this reservation');
    }

    return this.prisma.reservation.update({
      where: { id },
      data: { notes },
      select: this.safeReservationSelect,
    });
  }
}
