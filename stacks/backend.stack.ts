import {
  apigatewayv2 as gtw2,
  AwsProvider,
  cloudwatch,
  dynamodb,
  iam,
  lambdafunction as lambda
} from '@cdktf/provider-aws';
import { AssetType, Fn, TerraformAsset, TerraformOutput, TerraformStack } from 'cdktf';
import { Construct } from 'constructs';
import * as path from 'node:path';

// Types
export interface BackendOpts {
  stage: string;
  frontendUrl: string;
}

// Stack
export class BackendStack extends TerraformStack {
  constructor(scope: Construct, id: string, opts: BackendOpts) {
    super(scope, id);

    // Provider
    new AwsProvider(this, 'AWS', {
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
    const table = new dynamodb.DynamodbTable(this, 'todos-table', {
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
    const lambdaRole = new iam.IamRole(this, 'lambda-role', {
      name: `lambda-api-cdktf-stack-${opts.stage}`,
      assumeRolePolicy: JSON.stringify({
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Action: ["sts:AssumeRole"],
            Principal: {
              Service: ["lambda.amazonaws.com"],
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
    const logs = new cloudwatch.CloudwatchLogGroup(this, 'todos-logs', {
      name: `/aws/apigateway/todos-api-cdktf-stack-${opts.stage}`,
    });

    // Api Gateway
    const api = new gtw2.Apigatewayv2Api(this, 'todos-api', {
      name: `todos-api-cdktf-stack-${opts.stage}`,
      protocolType: 'HTTP',

      corsConfiguration: {
        allowOrigins: [opts.frontendUrl]
      }
    });

    new gtw2.Apigatewayv2Stage(this, 'default-stage', {
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
    const lambdaCode = new TerraformAsset(this, 'lambda-code', {
      path: path.resolve(__dirname, '../backend/dist/lambda.zip'),
      type: AssetType.FILE
    });

    const lambdaApi = new lambda.LambdaFunction(this, 'lambda-api', {
      functionName: `todos-api-cdktf-stack-${opts.stage}`,
      role: lambdaRole.arn,
      runtime: 'nodejs16.x',
      handler: 'lambda.handler',
      filename: lambdaCode.path,
      sourceCodeHash: Fn.filebase64sha256(lambdaCode.path),

      environment: {
        variables: {
          TODO_TABLE: table.name,
        },
      },

      tracingConfig: {
        mode: 'Active'
      }
    });

    new lambda.LambdaPermission(this, 'lambda-permission', {
      functionName: lambdaApi.functionName,
      action: 'lambda:InvokeFunction',
      principal: 'apigateway.amazonaws.com',
      sourceArn: `${api.executionArn}/*/*/{proxy+}`
    });

    const lambdaInt = new gtw2.Apigatewayv2Integration(this, 'todos-lambda-integration', {
      apiId: api.id,
      integrationType: 'AWS_PROXY',
      connectionType: 'INTERNET',
      integrationMethod: 'POST',
      integrationUri: lambdaApi.invokeArn,
      passthroughBehavior: 'WHEN_NO_MATCH',
      payloadFormatVersion: '2.0'
    });

    new gtw2.Apigatewayv2Route(this, 'todos-lambda-rooute', {
      apiId: api.id,
      routeKey: 'ANY /{proxy+}',
      target: `integrations/${lambdaInt.id}`
    });

    new TerraformOutput(this, 'api-url', {
      value: api.apiEndpoint,
    });
  }
}
