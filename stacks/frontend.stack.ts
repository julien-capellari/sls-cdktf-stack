import { AwsProvider, cloudfront as cf, s3 } from '@cdktf/provider-aws';
import { TerraformOutput, TerraformStack } from 'cdktf';
import { Construct } from 'constructs';

// Constants
const S3_ORIGIN_ID = 'todos-react-origin';

// Types
export interface FrontendOpts {
  stage: string;
}

// Stack
export class FrontendStack extends TerraformStack {
  constructor(scope: Construct, id: string, opts: FrontendOpts) {
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

    // Ressources
    const bucket = new s3.S3Bucket(this, 'todos-react', {
      bucket: `todos-react-cdktf-stack-${opts.stage}`,
    });

    // Cloudfront
    const oac = new cf.CloudfrontOriginAccessControl(this, 'todos-oac', {
      name: `todos-oac-${opts.stage}`,
      originAccessControlOriginType: 's3',
      signingBehavior: 'always',
      signingProtocol: 'sigv4',
    });

    const distrib = new cf.CloudfrontDistribution(this, 'todos', {
      enabled: true,
      isIpv6Enabled: true,
      priceClass: 'PriceClass_100',
      retainOnDelete: true,
      defaultRootObject: 'index.html',

      viewerCertificate: {
        cloudfrontDefaultCertificate: true,
      },

      restrictions: {
        geoRestriction: {
          restrictionType: 'none',
        },
      },

      origin: [
        {
          domainName: bucket.bucketRegionalDomainName,
          originId: S3_ORIGIN_ID,
          originAccessControlId: oac.id,
        }
      ],

      defaultCacheBehavior: {
        allowedMethods: ['GET', 'HEAD', 'OPTIONS'],
        cachedMethods: ['GET', 'HEAD'],
        targetOriginId: S3_ORIGIN_ID,

        forwardedValues: {
          queryString: false,

          cookies: {
            forward: 'none',
          },
        },

        viewerProtocolPolicy: 'redirect-to-https',
        minTtl: 0,
        defaultTtl: 3600,
        maxTtl: 86400,
        compress: true,
      },

      orderedCacheBehavior: [
        {
          pathPattern: '/index.html',
          allowedMethods: ['GET', 'HEAD', 'OPTIONS'],
          cachedMethods: ['GET', 'HEAD'],
          targetOriginId: S3_ORIGIN_ID,

          forwardedValues: {
            queryString: false,

            cookies: {
              forward: 'none',
            },
          },

          viewerProtocolPolicy: 'redirect-to-https',
          minTtl: 0,
          defaultTtl: 0,
          maxTtl: 0,
          compress: true,
        }
      ],

      customErrorResponse: [
        {
          errorCachingMinTtl: 300,
          errorCode: 404,
          responseCode: 200,
          responsePagePath: '/index.html'
        }
      ],

      tags: {
        Name: `todos-cdktf-${opts.stage}`
      }
    });

    // Config S3
    new s3.S3BucketAcl(this, 'todos-react-acl', {
      bucket: bucket.id,
      acl: 'private',
    });

    new s3.S3BucketPublicAccessBlock(this, 'todos-react-pab', {
      bucket: bucket.id,
      blockPublicAcls: true,
      blockPublicPolicy: true,
      ignorePublicAcls: true,
      restrictPublicBuckets: true,
    });

    new s3.S3BucketVersioningA(this, 'todos-react-ver', {
      bucket: bucket.id,

      versioningConfiguration: {
        status: 'Enabled'
      }
    });

    new s3.S3BucketPolicy(this, 'todos-react-policy', {
      bucket: bucket.id,
      policy: JSON.stringify({
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Action: ["s3:GetObject"],
            Resource: [`${bucket.arn}/*`],
            Principal: {
              AWS: ["cloudfront.amazonaws.com"],
            },
            Condition: {
              StringEquals: {
                "aws:SourceArn": distrib.arn
              },
            },
          },
        ],
      })
    });

    // Outputs
    new TerraformOutput(this, 'frontend-origin', {
      value: `https://${distrib.domainName}`
    });
  }
}
