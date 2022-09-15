import { DynamoDBDocumentClient, GetCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { Injectable, NotFoundException } from '@nestjs/common';

// Types
export interface Todo {
  id: string;
  name: string;
  done: boolean;
}

// Service
@Injectable()
export class TodosService {
  // Constructor
  constructor(
    private readonly dynamodb: DynamoDBDocumentClient,
  ) {}

  // Methods
  async listAll(): Promise<Todo[]> {
    const res = await this.dynamodb.send(new ScanCommand({
      TableName: process.env.TODO_TABLE
    }));

    return res.Items as Todo[];
  }

  async getById(id: string): Promise<Todo> {
    const res = await this.dynamodb.send(new GetCommand({
      TableName: process.env.TODO_TABLE,
      Key: { id }
    }));

    if (!res.Item) {
      throw new NotFoundException();
    }

    return res.Item as Todo;
  }
}
