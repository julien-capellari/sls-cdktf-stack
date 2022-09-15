import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { Module } from '@nestjs/common';
import AwsXRay from 'aws-xray-sdk-core';

// Module
@Module({
  providers: [
    {
      provide: DynamoDBDocumentClient,
      useFactory: () => {
        let client = new DynamoDBClient({});

        if (!process.env.IS_OFFLINE) {
          client = AwsXRay.captureAWSv3Client(client);
        }

        return DynamoDBDocumentClient.from(client);
      }
    }
  ],
  exports: [DynamoDBDocumentClient]
})
export class AwsModule {}
