import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InvitationStatus, UserRole } from '@prisma/client';
import { randomBytes } from 'crypto';
import { hash } from 'bcrypt';
import { PrismaService } from '../../database/prisma.service';
import { AcceptInvitationDto } from './dto/accept-invitation.dto';
import { CreateInvitationDto } from './dto/create-invitation.dto';

const invitationLifetimeInDays = 7;

@Injectable()
export class InvitationsService {
  constructor(private readonly prisma: PrismaService) {}

  async createInvitation(
    data: CreateInvitationDto,
    invitedByUserId: string,
    invitedByRole: string,
  ) {
    this.assertSuperAdmin(invitedByRole);
    await this.expireStaleInvitations();

    const email = data.email.trim().toLowerCase();
    const restaurantId = data.restaurantId?.trim() || undefined;

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingUser) {
      throw new ConflictException('This email is already registered.');
    }

    if (restaurantId) {
      const restaurant = await this.prisma.restaurant.findUnique({
        where: { id: restaurantId },
        select: { id: true },
      });

      if (!restaurant) {
        throw new NotFoundException('Restaurant not found.');
      }
    }

    const existingPendingInvitation = await this.prisma.invitation.findFirst({
      where: {
        email,
        status: InvitationStatus.PENDING,
      },
      select: { id: true },
    });

    if (existingPendingInvitation) {
      throw new ConflictException(
        'A pending invitation already exists for this email.',
      );
    }

    const invitation = await this.prisma.invitation.create({
      data: {
        email,
        role: UserRole.RESTAURANT_ADMIN,
        token: randomBytes(24).toString('hex'),
        invitedByUserId,
        restaurantId,
        expiresAt: new Date(
          Date.now() + invitationLifetimeInDays * 24 * 60 * 60 * 1000,
        ),
      },
      select: invitationAdminSelect,
    });

    return invitation;
  }

  async listInvitations(currentUserRole: string) {
    this.assertSuperAdmin(currentUserRole);
    await this.expireStaleInvitations();

    return this.prisma.invitation.findMany({
      orderBy: { createdAt: 'desc' },
      select: invitationAdminSelect,
    });
  }

  async getInvitationByToken(token: string) {
    await this.expireStaleInvitations();

    const invitation = await this.prisma.invitation.findUnique({
      where: { token },
      select: invitationPublicSelect,
    });

    if (!invitation || invitation.status !== InvitationStatus.PENDING) {
      throw new NotFoundException('Invitation not found.');
    }

    if (new Date(invitation.expiresAt).getTime() <= Date.now()) {
      await this.prisma.invitation.update({
        where: { token },
        data: { status: InvitationStatus.EXPIRED },
      });

      throw new BadRequestException('Invitation has expired.');
    }

    return invitation;
  }

  async acceptInvitation(data: AcceptInvitationDto) {
    await this.expireStaleInvitations();

    const token = data.token.trim();
    const invitation = await this.prisma.invitation.findUnique({
      where: { token },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        expiresAt: true,
        restaurantId: true,
      },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found.');
    }

    if (invitation.status === InvitationStatus.ACCEPTED) {
      throw new ConflictException('This invitation has already been accepted.');
    }

    if (invitation.status === InvitationStatus.EXPIRED) {
      throw new BadRequestException('Invitation has expired.');
    }

    if (new Date(invitation.expiresAt).getTime() <= Date.now()) {
      await this.prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: InvitationStatus.EXPIRED },
      });

      throw new BadRequestException('Invitation has expired.');
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { email: invitation.email },
      select: { id: true },
    });

    if (existingUser) {
      throw new ConflictException('This email is already registered.');
    }

    const passwordHash = await hash(data.password, 10);

    const result = await this.prisma.$transaction(async (transaction) => {
      const user = await transaction.user.create({
        data: {
          name: data.name.trim(),
          email: invitation.email,
          passwordHash,
          role: invitation.role,
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          createdAt: true,
        },
      });

      if (invitation.restaurantId) {
        await transaction.restaurant.update({
          where: { id: invitation.restaurantId },
          data: { ownerId: user.id },
        });
      }

      await transaction.invitation.update({
        where: { id: invitation.id },
        data: {
          status: InvitationStatus.ACCEPTED,
          acceptedAt: new Date(),
        },
      });

      return user;
    });

    return result;
  }

  private assertSuperAdmin(role: string) {
    if (role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only super admins can manage invitations.');
    }
  }

  private async expireStaleInvitations() {
    await this.prisma.invitation.updateMany({
      where: {
        status: InvitationStatus.PENDING,
        expiresAt: {
          lte: new Date(),
        },
      },
      data: {
        status: InvitationStatus.EXPIRED,
      },
    });
  }
}

const invitationAdminSelect = {
  id: true,
  email: true,
  role: true,
  token: true,
  status: true,
  invitedByUserId: true,
  expiresAt: true,
  acceptedAt: true,
  createdAt: true,
  restaurantId: true,
  restaurant: {
    select: {
      id: true,
      name: true,
    },
  },
  invitedBy: {
    select: {
      id: true,
      email: true,
      name: true,
    },
  },
} as const;

const invitationPublicSelect = {
  id: true,
  email: true,
  role: true,
  status: true,
  expiresAt: true,
  createdAt: true,
  restaurantId: true,
  restaurant: {
    select: {
      id: true,
      name: true,
    },
  },
} as const;
