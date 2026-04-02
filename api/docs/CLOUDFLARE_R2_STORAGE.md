# Cloudflare R2 Storage Architecture

This document explains our storage system using **Cloudflare R2**. We use an S3-compatible, **Direct-to-R2** upload pattern which eliminates egress fees and simplifies our architecture.

---

## 1. The Core Infrastructure

Our storage system relies on Cloudflare R2:

| Service | Role | Purpose |
| :--- | :--- | :--- |
| **Cloudflare R2** | **Storage** | S3-compatible object storage for models, textures, and assets. |
| **Direct Uploads** | **Performance** | Browser uploads directly to R2 using presigned URLs. |
| **Direct Reads** | **Delivery** | Browser downloads directly from R2 using signed GET URLs. |

---

## 2. Setup Guide: Getting Your API Keys

Follow these steps to connect your Cloudflare account to the platform:

### 1. Create an R2 Bucket
1. Log in to the [Cloudflare Dashboard](https://dash.cloudflare.com/).
2. Go to **R2** → **Overview**.
3. Click **Create bucket**.
4. **Name**: e.g., `cinematic-storyboarding-assets`.
5. Click **Create bucket**.

### 2. Get R2 API Tokens
1. In the R2 Overview page, click **Manage R2 API Tokens** on the right.
2. Click **Create API token**.
3. **Token name**: `cinematic-sb-api`.
4. **Permissions**: Choose **Object Read & Write**.
5. **Bucket**: Select your newly created bucket.
6. Click **Create API Token**.
7. **CRITICAL**: Copy the following values immediately:
   - **Access Key ID**
   - **Secret Access Key**
   - **Account ID** (Found in the dashboard URL or R2 overview)

### 3. Update your `.env` file
Paste your keys into `api/.env`:

```env
R2_ACCOUNT_ID="your-account-id"
R2_ACCESS_KEY_ID="your-access-key-id"
R2_SECRET_ACCESS_KEY="your-secret-access-key"
R2_BUCKET_NAME="cinematic-storyboarding-assets"
```

---

## 4. Security Layers

### Layer 1: Signed URLs
Every upload and download URL we generate expires in **15 minutes**.

### Layer 2: Magic Bytes Validation
Our backend checks the internal "fingerprint" of files to ensure they match their declared type.

### Layer 3: GLTF Sanitization
3D models are sanitized to remove malicious scripts before being used in the studio.
