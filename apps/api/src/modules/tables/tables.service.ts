import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateTableDto } from './dto/create-table.dto';
import { UpdateTableStatusDto } from './dto/update-table-status.dto';

@Injectable()
export class TablesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.table.findMany({
      select: {
        id: true,
        name: true,
        capacity: true,
        isActive: true,
        status: true,
        restaurantId: true,
        createdAt: true,
      },
    });
  }

  async create(data: CreateTableDto) {
    return this.prisma.table.create({
      data,
      select: {
        id: true,
        name: true,
        capacity: true,
        isActive: true,
        status: true,
        restaurantId: true,
        createdAt: true,
      },
    });
  }

  async updateStatus(
    tableId: string,
    userId: string,
    data: UpdateTableStatusDto,
  ) {
    // First, get the table with its restaurant owner info
    const table = await this.prisma.table.findUnique({
      where: { id: tableId },
      include: {
        restaurant: {
          select: {
            ownerId: true,
          },
        },
      },
    });

    if (!table) {
      throw new Error('Table not found');
    }

    // Check if the user is the owner of the restaurant
    if (table.restaurant.ownerId !== userId) {
      throw new Error(
        'Unauthorized: You can only update tables in your own restaurant',
      );
    }

    // Update the table status
    return this.prisma.table.update({
      where: { id: tableId },
      data: {
        status: data.status,
      },
      select: {
        id: true,
        name: true,
        capacity: true,
        isActive: true,
        status: true,
        restaurantId: true,
        createdAt: true,
      },
    });
  }
}
