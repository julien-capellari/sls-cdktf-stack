import { AwsProvider, apigatewayv2 as gtw2, cloudwatch, dynamodb, iam, lambdafunction as lambda } from '@cdktf/provider-aws';
import { TerraformOutput, TerraformStack } from 'cdktf';
import { Construct } from 'constructs';
import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';

// Types
export interface BackendOpts {
  stage: string;
  frontendUrl: string;
}

// Utils
function filehash(file: string): Promise<string> {
  return new Promise((resolve) => {
    const hash = crypto.createHash('sha256');
    hash.setEncoding('base64');

    const fd = fs.createReadStream(file);
    fd.on('finish', () => {
      resolve(hash.read());
    });

    fd.pipe(hash);
  });
}

// Stack
export async function BackendStack(scope: Construct, id: string, opts: BackendOpts) {
  const stack = new TerraformStack(scope, id);

  // Provider
  new AwsProvider(stack, 'AWS', {
    region: 'eu-west-3',
    profile: 'nx-perso',
    defaultTags: {
      tags: {
        Project: 'sls-cdktf-stack',
        Stage: opts.stage
      }
    }
  });

  // DynamoDB
  const table = new dynamodb.DynamodbTable(stack, 'todos-table', {
    name: `todo-cdktf-stack-${opts.stage}`,
    billingMode: 'PROVISIONED',
    readCapacity: 1,
    writeCapacity: 1,
    hashKey: 'id',

    attribute: [
      { name: 'id', type: 'S' },
    ],
  });

  // IAM
  const lambdaRole = new iam.IamRole(stack, 'lambda-role', {
    name: `lambda-api-cdktf-stack-${opts.stage}`,
    assumeRolePolicy: JSON.stringify({
      Version: "2012-10-17",
      Statement: [
        {
          Effect: "Allow",
          Action: ["sts:AssumeRole"],
          Principal: {
            AWS: ["lambda.amazonaws.com"],
          },
        },
      ],
    }),
    inlinePolicy: [
      {
        name: `lambda-api-cdktf-stack-${opts.stage}`,
        policy: JSON.stringify({
          Version: "2012-10-17",
          Statement: [
            {
              Effect: "Allow",
              Action: ["dynamodb:Scan", "dynamodb:GetItem"],
              Resource: [table.arn],
            },
            {
              Effect: "Allow",
              Action: ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PuLogEvents"],
              Resource: ["arn:aws:logs:*:*:*"],
            },
          ],
        }),
      }
    ]
  });

  // Cloud watch
  const logs = new cloudwatch.CloudwatchLogGroup(stack, 'todos-logs', {
    name: `/aws/apigateway/todos-api-cdktf-stack-${opts.stage}`,
  });

  // Api Gateway
  const api = new gtw2.Apigatewayv2Api(stack, 'todos-api', {
    name: `todos-api-cdktf-stack-${opts.stage}`,
    protocolType: 'HTTP',

    corsConfiguration: {
      allowOrigins: [opts.frontendUrl]
    }
  });

  new gtw2.Apigatewayv2Stage(stack, 'default-stage', {
    name: '$default',
    apiId: api.id,
    autoDeploy: true,

    accessLogSettings: {
      destinationArn: logs.arn,
      format: JSON.stringify({
        httpMethod: '$context.httpMethod',
        ip: '$context.identity.sourceIp',
        protocol: '$context.protocol',
        requestId: '$context.requestId',
        requestTime: '$context.requestTime',
        responseLength: '$context.responseLength',
        routeKey: '$context.routeKey',
        status: '$context.status',
      }),
    }
  });

  // Lambda
  const lambdaApi = new lambda.LambdaFunction(stack, 'lambda-api', {
    functionName: `todos-api-cdktf-stack-${opts.stage}`,
    role: lambdaRole.arn,
    runtime: 'nodejs16.x',
    handler: 'lambda.handler',
    filename: path.resolve(__dirname, '../backend/dist/lambda.zip'),
    sourceCodeHash: await filehash(path.resolve(__dirname, '../backend/dist/lambda.zip')),

    environment: {
      variables: {
        TODO_TABLE: table.name,
      },
    },

    tracingConfig: {
      mode: 'Active'
    }
  });

  new lambda.LambdaPermission(stack, 'lambda-permission', {
    functionName: lambdaApi.functionName,
    action: 'lambda:InvokeFunction',
    principal: 'apigateway.amazonaws.com',
    sourceArn: `${api.executionArn}/*/*/{proxy+}`
  });

  const lambdaInt = new gtw2.Apigatewayv2Integration(stack, 'todos-lambda-integration', {
    apiId: api.id,
    integrationType: 'AWS_PROXY',
    connectionType: 'INTERNET',
    integrationMethod: 'POST',
    integrationUri: lambdaApi.invokeArn,
    passthroughBehavior: 'WHEN_NO_MATCH',
    payloadFormatVersion: '2.0'
  });

  new gtw2.Apigatewayv2Route(stack, 'todos-lambda-rooute', {
    apiId: api.id,
    routeKey: 'ANY /{proxy+}',
    target: `integrations/${lambdaInt.id}`
  });

  new TerraformOutput(stack, 'api-url', {
    value: api.apiEndpoint,
  });
}
