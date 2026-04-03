# AXIOM — Postman Testing Guide

This guide provides instructions for testing the Cinematic Storyboarding BFF (Backend-for-Frontend) using Postman.

---

## 1. Prerequisites

1.  **Server Running**: Ensure the backend is running (usually `npm run dev` in the `api` directory).
2.  **Base URL**: `http://localhost:3001`
3.  **Database**: Ensure you have at least one user in your database to generate a token. If the DB is empty, run your seed script or insert a user manually.

---

## 2. Authentication Flow

The API uses JWT Bearer tokens and CSRF protection for all state-mutating requests.

### Step 1: Generate a Dev Token

Since we are in development, use the helper endpoint to get a token for a specific user ID.

- **Method**: `POST`
- **URL**: `{{baseUrl}}/dev/token`
- **Body (JSON)**:
  ```json
  {
    "userId": "your-user-id-here"
  }
  ```
- **Action**: Copy the `token` from the response. In Postman, go to your Collection settings -> **Authorization** tab -> Type: **Bearer Token** -> Paste the token.

### Step 2: Handle CSRF (Crucial for POST/PUT/DELETE)

The backend enforces the "Double-Submit Cookie" pattern.

1.  **Get the Cookie**: Make any `GET` request (e.g., `GET {{baseUrl}}/health/live`). Postman will automatically save the `csrf-token` cookie.
2.  **Set the Header**: For every `POST`, `PUT`, or `DELETE` request, you **must** add a header:
    - **Header Key**: `X-CSRF-Token`
    - **Value**: Copy the value of the `csrf-token` cookie (found in the "Cookies" section of Postman's response pane).

> [!TIP]
> You can automate this in Postman by adding a **Pre-request Script** to your collection that reads the cookie and sets a variable for the header.

---

## 3. API Endpoints Reference

### 📽️ Projects

| Method   | Endpoint            | Description                      | Role         |
| :------- | :------------------ | :------------------------------- | :----------- |
| `GET`    | `/api/projects`     | List all projects (paginated)    | Viewer+      |
| `GET`    | `/api/projects/:id` | Get project details + sequences  | Viewer+      |
| `POST`   | `/api/projects`     | Create a new project             | Editor+      |
| `PUT`    | `/api/projects/:id` | Update project name/aspect ratio | Editor+      |
| `DELETE` | `/api/projects/:id` | Soft-delete a project            | Admin+ (MFA) |

**Create Project Body:**

```json
{
  "name": "Project Alpha",
  "aspectRatio": "2.39:1"
}
```

---

### 🎞️ Sequences

| Method   | Endpoint                             | Description                 | Role         |
| :------- | :----------------------------------- | :-------------------------- | :----------- |
| `GET`    | `/api/projects/:projectId/sequences` | List sequences in a project | Viewer+      |
| `POST`   | `/api/projects/:projectId/sequences` | Create a sequence           | Editor+      |
| `PUT`    | `/api/sequences/:id`                 | Update sequence             | Editor+      |
| `DELETE` | `/api/sequences/:id`                 | Delete sequence             | Admin+ (MFA) |

**Create Sequence Body:**

```json
{
  "name": "Opening Scene",
  "orderIndex": 0
}
```

---

### 🎬 Shots

| Method   | Endpoint                           | Description                     | Role         |
| :------- | :--------------------------------- | :------------------------------ | :----------- |
| `GET`    | `/api/sequences/:sequenceId/shots` | List shots in a sequence        | Viewer+      |
| `POST`   | `/api/sequences/:sequenceId/shots` | Create a shot                   | Editor+      |
| `PUT`    | `/api/shots/:id`                   | Update shot scene data/duration | Editor+      |
| `DELETE` | `/api/shots/:id`                   | Delete shot                     | Admin+ (MFA) |

**Create Shot Body:**

```json
{
  "name": "Wide Shot 01",
  "orderIndex": 0,
  "durationSec": 5.5,
  "sceneData": {
    "camera": { "pos": [0, 5, 10] },
    "objects": []
  }
}
```

---

### 📦 Assets (R2/S3)

| Method | Endpoint                   | Description             | Role    |
| :----- | :------------------------- | :---------------------- | :------ |
| `POST` | `/api/assets/presign`      | Get a signed upload URL | Editor+ |
| `GET`  | `/api/assets/url?key=...`  | Get a signed read URL   | Viewer+ |
| `GET`  | `/api/assets/gltf?key=...` | Fetch & sanitize GLTF   | Viewer+ |

**Presign Body:**

```json
{
  "projectId": "uuid",
  "assetType": "model",
  "fileName": "character.gltf",
  "mimeType": "model/gltf+json",
  "fileSize": 1048576
}
```

---

### 👥 Users & Organizations

| Method | Endpoint             | Description                | Role         |
| :----- | :------------------- | :------------------------- | :----------- |
| `GET`  | `/api/organizations` | Get your organization info | Viewer+      |
| `GET`  | `/api/users`         | List team members          | Viewer+      |
| `POST` | `/api/users`         | Invite new user            | Admin+ (MFA) |

---

## 4. Common Response Codes

- `200 OK`: Success.
- `201 Created`: Resource created.
- `400 Bad Request`: Validation error (check Zod messages).
- `401 Unauthorized`: Missing or invalid JWT.
- `403 Forbidden`: Insufficient role or CSRF mismatch.
- `404 Not Found`: Resource doesn't exist or belongs to another org.
- `429 Too Many Requests`: Rate limit hit.

---

## 5. Pro Tips for Postman

1.  **Environments**: Create an environment with `baseUrl` and `jwtToken`.
2.  **Automation**: Add this to the **Tests** tab of your `POST /dev/token` request to automatically update your environment:
    ```javascript
    const jsonData = pm.response.json();
    pm.environment.set("jwtToken", jsonData.token);
    ```
3.  **Correlation ID**: Every response includes an `X-Correlation-Id` header. Use this when debugging server logs to trace a specific request.
