import json, os, boto3

table = boto3.resource("dynamodb").Table(os.environ["TABLE_NAME"])

def handler(event, context):
    job_id = event["pathParameters"]["jobId"]
    res = table.get_item(Key={"PK": f"JOB#{job_id}", "SK": f"JOB#{job_id}"})
    item = res.get("Item")
    if not item:
        return {"statusCode": 404, "body": json.dumps({"error": "not found"})}
    return {"statusCode": 200, "body": json.dumps(item, default=str)}