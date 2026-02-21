import { Controller, Get, Param } from '@nestjs/common';

@Controller('requests')
export class RequestsController {
  @Get()
  list() {
    return [];
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return { id };
  }
}
