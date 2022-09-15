import { Controller, Get, Param } from '@nestjs/common';

import { Todo, TodosService } from './todos.service';

// Controller
@Controller('/todos')
export class TodosController {
  // Constructor
  constructor(
    private readonly service: TodosService,
  ) {}

  // Endpoints
  @Get('/')
  async list(): Promise<Todo[]> {
    return await this.service.listAll();
  }

  @Get('/:id')
  async getById(@Param('id') id): Promise<Todo> {
    return await this.service.getById(id);
  }
}
