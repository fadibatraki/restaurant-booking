import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly safeNotificationSelect = {
    id: true,
    type: true,
    title: true,
    body: true,
    isRead: true,
    createdAt: true,
    reservationId: true,
    restaurantId: true,
    actorUserId: true,
  } as const;

  findMine(userId: string) {
    return this.prisma.notification.findMany({
      where: { recipientUserId: userId },
      orderBy: { createdAt: 'desc' },
      select: this.safeNotificationSelect,
    });
  }

  async markRead(id: string, userId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id },
      select: {
        id: true,
        recipientUserId: true,
      },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    if (notification.recipientUserId !== userId) {
      throw new ForbiddenException('You cannot update this notification');
    }

    return this.prisma.notification.update({
      where: { id },
      data: { isRead: true },
      select: this.safeNotificationSelect,
    });
  }

  async markAllRead(userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: {
        recipientUserId: userId,
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });

    return {
      updatedCount: result.count,
    };
  }
}
