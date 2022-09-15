import { Module } from '@nestjs/common';

import { AwsModule } from '../aws.module';
import { TodosService } from './todos.service';
import { TodosController } from './todos.controller';

// Module
@Module({
  imports: [AwsModule],
  controllers: [TodosController],
  providers: [TodosService],
})
export class TodosModule {}
