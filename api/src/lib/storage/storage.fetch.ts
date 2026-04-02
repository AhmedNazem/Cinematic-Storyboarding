import { GetObjectCommand } from "@aws-sdk/client-s3";
import { storageClient, STORAGE_BUCKET } from "./storage.client";

export async function fetchObjectAsText(assetKey: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: STORAGE_BUCKET,
    Key: assetKey,
  });

  const response = await storageClient.send(command);

  if (!response.Body) {
    throw Object.assign(new Error("R2 object has no body"), {
      statusCode: 404,
    });
  }

  return response.Body.transformToString("utf-8");
}
