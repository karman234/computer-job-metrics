import * as cdk from 'aws-cdk-lib/core';
import { Construct } from 'constructs';
import * as lambda from "aws-cdk-lib/aws-lambda-nodejs";
import * as lambdaBase from "aws-cdk-lib/aws-lambda";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class InfraStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const helloFn = new lambda.NodejsFunction(this, "HelloFunction", {
      entry: "lambda/hello.ts",
      handler: "handler",
      runtime: lambdaBase.Runtime.NODEJS_20_X,
    });

    const table = new dynamodb.Table(this, "JobsTable",{
      partitionKey: {name: "PK", type: dynamodb.AttributeType.STRING},
      sortKey: {name: "SK", type: dynamodb.AttributeType.STRING},
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    table.addGlobalSecondaryIndex({
      indexName: "GSI1",
      partitionKey: { name: "GSI1PK", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "GSI1SK", type: dynamodb.AttributeType.STRING },
    });

    const ingestFn = new lambda.NodejsFunction(this, "IngestFunction", {
      entry: "lambda/ingest.ts",
      handler: "handler",
      runtime: lambdaBase.Runtime.NODEJS_20_X,
      environment: { TABLE_NAME: table.tableName},
    });

    table.grantReadWriteData(ingestFn);

    const getFn = new lambdaBase.Function(this, "GetFunction", {
      runtime: lambdaBase.Runtime.PYTHON_3_12,
      handler: "app.handler",
      code: lambdaBase.Code.fromAsset("../services/get"),
      environment: { TABLE_NAME: table.tableName },
    });
    table.grantReadData(getFn);

    const api = new apigateway.RestApi(this, "JobApi");
    const jobs = api.root.addResource("jobs");
    const job = jobs.addResource("{jobId}");
    job.addMethod("GET", new apigateway.LambdaIntegration(getFn));
    jobs.addMethod("POST", new apigateway.LambdaIntegration(ingestFn));
    new cdk.CfnOutput(this, "ApiURL", {value: api.url});



  }
}
