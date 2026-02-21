import { Controller, Get, Param } from '@nestjs/common';

@Controller('subscribers')
export class SubscribersController {
  @Get()
  list() {
    return [];
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return { id };
  }
}
