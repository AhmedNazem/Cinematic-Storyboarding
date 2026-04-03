import { GetObjectCommand } from "@aws-sdk/client-s3";
import { storageClient, STORAGE_BUCKET } from "./storage.client";
import { ApiError } from "../utils/api-error";

export async function fetchObjectAsText(assetKey: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: STORAGE_BUCKET,
    Key: assetKey,
  });

  const response = await storageClient.send(command);

  if (!response.Body) {
    throw ApiError.notFound("Asset");
  }

  return response.Body.transformToString("utf-8");
}
