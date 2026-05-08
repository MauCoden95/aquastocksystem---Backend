import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, Query } from '@nestjs/common';
import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('clients')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Post()
  create(@Body() createClientDto: CreateClientDto, @Request() req) {
    return this.clientsService.create(createClientDto, req.user?.id);
  }

  @Get()
  findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('search') search?: string,
    @Query('isActive') isActive?: string,
  ) {
    const activeFilter = isActive === 'true' ? true : isActive === 'false' ? false : undefined;
    return this.clientsService.findAll(+page, +limit, search, activeFilter);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.clientsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateClientDto: UpdateClientDto, @Request() req) {
    return this.clientsService.update(+id, updateClientDto, req.user?.id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.clientsService.remove(+id);
  }

  @Patch(':id/restore')
  restore(@Param('id') id: string) {
    return this.clientsService.restore(+id);
  }
}
