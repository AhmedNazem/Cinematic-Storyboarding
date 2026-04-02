import "dotenv/config";
import { generatePresignedUpload } from "./lib/storage/storage.presign";
import { generateSignedReadUrl } from "./lib/storage/signed-urls";

async function testR2() {
  console.log("🚀 Starting Cloudflare R2 Connectivity Test...");

  try {
    // 1. Generate an upload token for a test text file
    const uploadResult = await generatePresignedUpload({
      orgId: "test-org",
      projectId: "test-project",
      assetType: "thumbnail",
      mimeType: "image/png", // We'll just pretend it's a PNG for the mime-check
      ext: "txt",
    });

    console.log("\n✅ Step 1: Presigned URL Generated!");
    console.log("--------------------------------------------------");
    console.log("Upload URL:", uploadResult.uploadUrl);
    console.log("Asset Key: ", uploadResult.assetKey);
    console.log("--------------------------------------------------");

    console.log("\n👉 COPY & PASTE THIS COMMAND TO UPLOAD (CMD / BASH):");
    console.log(`curl -X PUT -H "Content-Type: image/png" --data "AXIOM R2 TEST SUCCESSFUL" "${uploadResult.uploadUrl}"`);

    console.log("\n👉 OR USE THIS IN POWERSHELL:");
    console.log(`Invoke-RestMethod -Method Put -ContentType "image/png" -Body "AXIOM R2 TEST SUCCESSFUL" -Uri "${uploadResult.uploadUrl}"`);

    // 2. Generate a read URL (even if the file isn't there yet, we want to see the URL format)
    const readUrl = await generateSignedReadUrl(uploadResult.assetKey);

    console.log("\n✅ Step 2: Read URL Logic Verified!");
    console.log("--------------------------------------------------");
    console.log("Once you run the curl command, you can view the result here:");
    console.log(readUrl);
    console.log("--------------------------------------------------");

  } catch (error) {
    console.error("\n❌ Test Failed!");
    console.error(error);
  }
}

testR2();
