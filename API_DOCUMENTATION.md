# UniStay Hostel Management System — REST API Documentation

**Base URL (Same-Origin):** `/api` (also mirrored at `/api/v1`)  
**Database:** MongoDB Atlas (`hostelDB`) via Mongoose ODM  
**Authentication:** Bearer JWT (`Authorization: Bearer <token>`)

---

## 1. Environment Configuration

Configure the following server-side variables in `.env` (never expose these in frontend JavaScript):

| Variable | Description | Example |
| --- | --- | --- |
| `PORT` | HTTP server port | `3000` |
| `MONGODB_URI` | MongoDB Atlas connection string (`hostelDB`) | `mongodb+srv://<user>:<pass>@cluster.mongodb.net/hostelDB` |
| `JWT_SECRET` | Cryptographic secret for signing JWT tokens (min 16 chars) | `<random-64-char-hex>` |
| `JWT_EXPIRES_IN` | Token lifetime | `7d` |
| `CLIENT_URL` | Allowed frontend origin for CORS when served separately | `http://127.0.0.1:5500` |
| `ADMIN_SEED_NAME` | Initial administrator name for `seedAdmin.js` | `Hostel Chief Warden` |
| `ADMIN_SEED_EMAIL` | Initial administrator email for `seedAdmin.js` | `warden.admin@university.edu` |
| `ADMIN_SEED_PASSWORD` | Initial administrator password for `seedAdmin.js` | `<secure-password>` |
| `ADMIN_SEED_KEY` | One-time provisioning header key (`x-admin-seed-key`) | `<secure-seed-key>` |

Provision the initial administrator via CLI:

```bash
node backend/utils/seedAdmin.js
```

---

## 2. Health Check

### `GET /api/health`
Reports Express server status and MongoDB Atlas connection state.

- **Auth:** Public
- **Response `200 OK`:**
```json
{
  "ok": true,
  "server": "running",
  "database": "connected",
  "databaseReadyState": 1,
  "databaseName": "hostelDB",
  "databaseConfigured": true,
  "timestamp": "2026-11-14T09:45:00.000Z"
}
```

---

## 3. Authentication Endpoints

### `POST /api/auth/register`
Registers a new **student** account. Public registration is strictly restricted to `role: "student"`. Attempting to pass `role: "admin"` returns `403 Forbidden`.

- **Auth:** Public
- **Request Body:**
```json
{
  "name": "Priya Nair",
  "email": "priya.nair@university.edu",
  "studentId": "STU-2026-501",
  "password": "StrongPassword123",
  "contact": "9876543210",
  "gender": "Female"
}
```
- **Response `201 Created`:**
```json
{
  "ok": true,
  "token": "<jwt-token>",
  "user": {
    "_id": "6735...",
    "name": "Priya Nair",
    "email": "priya.nair@university.edu",
    "role": "student",
    "studentId": "STU-2026-501",
    "contact": "9876543210",
    "gender": "Female"
  }
}
```

### `POST /api/auth/login`
Authenticates a student or administrator and returns a signed JWT. Optionally accepts `expectedRole` (`"student"` or `"admin"`) to enforce portal separation.

- **Auth:** Public
- **Request Body:**
```json
{
  "email": "priya.nair@university.edu",
  "password": "StrongPassword123",
  "expectedRole": "student"
}
```
- **Response `200 OK`:** Returns `{ "ok": true, "token": "<jwt>", "user": { ... } }`.
- **Errors:** `401 Unauthorized` (bad credentials), `403 Forbidden` (wrong portal role).

### `GET /api/auth/me`
Returns the authenticated user's profile with populated `allocatedHostelId` and `allocatedRoomId`.

- **Auth:** Bearer JWT (`student` or `admin`)
- **Response `200 OK`:** `{ "ok": true, "user": { ... } }`

### `PUT /api/auth/me`
Updates safe self-profile fields (`name`, `contact`, `department`, `year`) for the authenticated user.

- **Auth:** Bearer JWT (`student` or `admin`)
- **Request Body:** `{ "fullName": "Priya Nair", "contactNumber": "9876543210", "department": "CSE", "year": "2nd Year" }`
- **Response `200 OK`:** `{ "ok": true, "user": { ... } }`

---

## 4. Hostel Management Endpoints

### `GET /api/hostels`
Lists all hostels with aggregated configured room counts, available room counts, total capacity, and occupied beds.

- **Auth:** Bearer JWT (`student` or `admin`)
- **Response `200 OK`:** `{ "ok": true, "data": [ ... ] }`

### `GET /api/hostels/:id`
Returns a single hostel by ObjectId along with its rooms list.

- **Auth:** Bearer JWT (`student` or `admin`)
- **Response `200 OK`:** `{ "ok": true, "data": { ..., "rooms": [ ... ] } }`

### `POST /api/hostels`
Creates a new residence hall.

- **Auth:** Bearer JWT (`admin` only)
- **Request Body:**
```json
{
  "name": "North Residence Hall",
  "type": "Boys",
  "address": "Sector 2, North Campus Avenue",
  "totalRooms": 120,
  "warden": "Dr. R. Kulkarni"
}
```
- **Response `201 Created`:** `{ "ok": true, "data": { ... } }`

### `PUT /api/hostels/:id`
Updates an existing hostel's metadata.

- **Auth:** Bearer JWT (`admin` only)

### `DELETE /api/hostels/:id`
Deletes a hostel if it has zero rooms (`409 Conflict` if rooms exist).

- **Auth:** Bearer JWT (`admin` only)

---

## 5. Room Management Endpoints

### `GET /api/rooms`
Lists rooms with optional query filters: `hostelId`, `hostelType` (`Boys` | `Girls`), `type` (`Single` | `Double` | `Triple`), `status` (`Available` | `Full`), and `search`.

- **Auth:** Bearer JWT (`student` or `admin`)

### `GET /api/rooms/available`
Lists only rooms where `status === "Available"` (supports same optional filters).

- **Auth:** Bearer JWT (`student` or `admin`)

### `GET /api/rooms/:id`
Returns a single room by ObjectId with populated hostel details and `availableSeats`.

- **Auth:** Bearer JWT (`student` or `admin`)

### `POST /api/rooms`
Creates a room under a hostel. Enforces unique `(hostelId, roomNumber)` and `occupiedCount <= capacity`.

- **Auth:** Bearer JWT (`admin` only)
- **Request Body:**
```json
{
  "hostelId": "6735...",
  "roomNumber": "N-204",
  "type": "Double",
  "capacity": 2,
  "occupiedCount": 0,
  "floor": "2nd Floor"
}
```

### `PUT /api/rooms/:id`
Updates room details while enforcing `occupiedCount <= capacity` and syncing `status` (`Available` / `Full`).

- **Auth:** Bearer JWT (`admin` only)

---

## 6. Room Application Endpoints

### `POST /api/requests`
Submits a `Pending` room allocation request for the authenticated student (`req.user._id`). Does **not** increment room occupancy until approved. Prevents duplicate `Pending` requests and gender-hostel mismatches.

- **Auth:** Bearer JWT (`student` only)
- **Request Body:**
```json
{
  "hostelId": "6735...",
  "roomId": "6735...",
  "notes": "Prefer 2nd floor near study hall."
}
```
- **Response `201 Created`:** `{ "ok": true, "data": { ... } }`

### `GET /api/requests/my`
Lists all room allocation requests belonging to the authenticated student.

- **Auth:** Bearer JWT (`student` only)

### `GET /api/requests`
Lists all student room requests with optional `status` and `search` filters.

- **Auth:** Bearer JWT (`admin` only)

### `PUT /api/requests/:id/approve` (also `PATCH`)
Atomically approves a `Pending` request, increments `Room.occupiedCount` (only if `occupiedCount < capacity`), updates `Room.status` to `Full` if capacity is reached, and assigns `allocatedHostelId` + `allocatedRoomId` on the student `User` document.

- **Auth:** Bearer JWT (`admin` only)
- **Request Body:** `{ "adminNote": "Approved for Spring semester." }`
- **Errors:** `409 Conflict` if request is not `Pending` or room is already full.

### `PUT /api/requests/:id/reject` (also `PATCH`)
Marks a `Pending` request as `Rejected` with an optional administrative reason. Does not alter room occupancy.

- **Auth:** Bearer JWT (`admin` only)
- **Request Body:** `{ "reason": "Reserved for senior cohort.", "adminNote": "..." }`

---

## 7. Complaint Management Endpoints

### `POST /api/complaints`
Submits a maintenance complaint for the authenticated student. Accepts either `roomId` or `{ hostelId, roomNumber }`.

- **Auth:** Bearer JWT (`student` only)
- **Request Body:**
```json
{
  "hostelId": "6735...",
  "roomNumber": "N-204",
  "category": "Plumbing",
  "description": "Bathroom tap is leaking continuously."
}
```
- **Response `201 Created`:** `{ "ok": true, "data": { ... } }`

### `GET /api/complaints/my`
Lists all complaints submitted by the authenticated student.

- **Auth:** Bearer JWT (`student` only)

### `GET /api/complaints`
Lists all complaints with optional `status`, `category`, and `search` filters.

- **Auth:** Bearer JWT (`admin` only)

### `PUT /api/complaints/:id` (also `PATCH /api/complaints/:id/resolve`)
Updates a complaint's status (`Pending` | `Resolved`) and `resolutionNote`.

- **Auth:** Bearer JWT (`admin` only)
- **Request Body:**
```json
{
  "status": "Resolved",
  "resolutionNote": "Replaced faulty washer and tested pressure."
}
```

---

## 8. Dashboard & Reporting Endpoints

### `GET /api/dashboard/summary`
Returns live KPI counts (`totalHostels`, `totalRooms`, `occupiedRooms`, `availableRooms`, `fullRooms`, `pendingRequests`, `activeComplaints`, `occupancyRate`), per-hostel occupancy bars, and the 5 most recent requests and complaints.

- **Auth:** Bearer JWT (`admin` only)

### `GET /api/dashboard/occupancy`
Returns live occupancy metrics overall, broken down by hostel (`byHostel`) and by room type (`byRoomType`).

- **Auth:** Bearer JWT (`admin` only)

### `GET /api/dashboard/recent-activity`
Returns chronological recent requests and complaints. Admins see system-wide activity; students see their own activity.

- **Auth:** Bearer JWT (`student` or `admin`)

### `GET /api/dashboard/student`
Returns the authenticated student's profile, allocated hostel/room, roommates, pending request, complaint summary, and recent activity.

- **Auth:** Bearer JWT (`student` only)

### `GET /api/dashboard/students`
Lists registered student accounts with optional `status` (`Allocated` | `Unallocated`) and `search` filters.

- **Auth:** Bearer JWT (`admin` only)

---

## 9. Standard Error Format

All error responses return structured JSON:

```json
{
  "ok": false,
  "message": "Human-readable error explanation",
  "errors": {
    "fieldName": "Optional field-level validation message"
  }
}
```

Common HTTP status codes: `400` Validation Error, `401` Missing/Invalid/Expired JWT, `403` Role Forbidden, `404` Resource Not Found, `409` Duplicate or Capacity Conflict, `503` Database Disconnected.
