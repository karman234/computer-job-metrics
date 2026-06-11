import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { randomUUID } from "crypto";

const db = DynamoDBDocumentClient.from(new DynamoDBClient({}));

export const handler = async (event: any) => {
  const body = JSON.parse(event.body ?? "{}");

  // input validation (spec security checklist)
  if (!body.submittedBy || !body.cluster) {
    return { statusCode: 400, body: JSON.stringify({ error: "submittedBy and cluster required" }) };
  }

  const submittedAt = new Date().toISOString();
  const status = "QUEUED";
  const jobId = randomUUID();
  const item = {
    PK: `JOB#${jobId}`,
    SK: `JOB#${jobId}`,
    jobId,
    submittedBy: body.submittedBy,
    cluster: body.cluster,
    status: "QUEUED",
    submittedAt: new Date().toISOString(),
    completedAt: null,
    runtimeSeconds: 0,
    cpuHours: 0,
    exitCode: null,
    GSI1PK: `STATUS#${status}`,
    GSI1SK: submittedAt,
  };

  await db.send(new PutCommand({ TableName: process.env.TABLE_NAME, Item: item }));
  return { statusCode: 201, body: JSON.stringify(item) };
};
