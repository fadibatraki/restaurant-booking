import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateTableDto } from './dto/create-table.dto';
import { UpdateTableStatusDto } from './dto/update-table-status.dto';
import { TablesService } from './tables.service';

type AuthenticatedRequest = Request & {
  user: {
    sub: number | string;
    email: string;
    role: string;
  };
};

@Controller('tables')
export class TablesController {
  constructor(private readonly tablesService: TablesService) {}

  @Get()
  findAll() {
    return this.tablesService.findAll();
  }

  @Post()
  create(@Body() body: CreateTableDto) {
    return this.tablesService.create(body);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard)
  async updateStatus(
    @Param('id') id: string,
    @Body() body: UpdateTableStatusDto,
    @Req() request: AuthenticatedRequest,
  ) {
    try {
      return await this.tablesService.updateStatus(
        id,
        String(request.user.sub),
        body,
      );
    } catch (error) {
      if (error.message === 'Table not found') {
        throw new NotFoundException('Table not found');
      }
      if (error.message.includes('Unauthorized')) {
        throw new ForbiddenException(
          'You can only update tables in your own restaurant',
        );
      }
      throw error;
    }
  }
}
