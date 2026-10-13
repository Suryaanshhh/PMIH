# PMIH Backend API Guide for React Frontends

This document describes the API currently implemented by this backend. Use it as the source of truth when generating a React frontend. Do not invent endpoints or fields that are not listed here.

## Backend and Requests

- Local base URL: `http://localhost:5000/api` (`PORT` defaults to `5000` and can be overridden in the backend environment).
- All endpoints below are relative to the base URL.
- JSON endpoints accept and return JSON. Send `Content-Type: application/json` when sending JSON bodies.
- CORS is enabled. There is currently no authentication or authorization; this is a development-stage API.
- IDs are UUID strings.
- List endpoints return paginated objects with `items`, `page`, `pageSize`, `total`, and `totalPages`. Defaults are `page=1`, `pageSize=20`; maximum page size is 100.
- Date inputs use `YYYY-MM-DD`. Dates returned by Prisma may be serialized as ISO timestamps; for date inputs such as `<input type="date">`, display the `YYYY-MM-DD` portion.
- For React, keep the API base URL configurable (for example, `VITE_API_BASE_URL`) and put fetch calls in a small API/client layer rather than components.

## Health

| Method | Path | Result |
|---|---|---|
| GET | `/health` | `200 { "status": "API is running", "database": "ok" }`; returns `503` with `database: "unreachable"` if the database check fails. |

## Clients

| Method | Path | Behavior |
|---|---|---|
| GET | `/clients` | List, optionally filtered by `search` (case-insensitive name contains). Supports `page`, `pageSize`. Items include `_count` for `programs` and `projects`. |
| GET | `/clients/:id` | One client with `_count` for `programs`, `projects`, `tasks`, `commitments`, and `sourceRecords`. |
| POST | `/clients` | Create a client; responds `201` with the created client. |
| PATCH | `/clients/:id` | Update provided fields; responds with the updated client. |
| DELETE | `/clients/:id` | Delete; responds `204` with no body. Refuses deletion when referenced. |

Client JSON shape:

```json
{
  "id": "uuid",
  "name": "Acme",
  "industry": "Technology",
  "keyContacts": [{ "name": "Jordan Lee", "email": "jordan@example.com", "role": "Sponsor" }],
  "createdAt": "ISO timestamp",
  "updatedAt": "ISO timestamp"
}
```

Create requires `name` (trimmed, 1-255 chars). `industry` is optional (up to 100 chars). `keyContacts` is optional and defaults to `[]`; each contact requires `name` (1-255 chars), with optional valid `email` and `role` (up to 100 chars). On PATCH, all fields are optional; `keyContacts`, if sent, must be an array. Client names are case-insensitively unique. `industry` cannot currently be cleared with `null`.

## Projects

| Method | Path | Behavior |
|---|---|---|
| GET | `/projects` | List; filters: `search` (name contains), `clientId`, `status`; supports pagination. Each item includes `client: { id, name }` and `_count` for `tasks` and `milestones`. |
| GET | `/projects/:id` | One project with `client`, optional `program`, and `_count` for related records. |
| POST | `/projects` | Create; responds `201` with the project. |
| PATCH | `/projects/:id` | Update mutable project fields; responds with the project. |
| DELETE | `/projects/:id` | Delete; responds `204`. Refuses deletion when related records exist. |

Create payload example:

```json
{
  "clientId": "client-uuid",
  "name": "Website Renewal",
  "description": "Optional project description",
  "phase": "Discovery",
  "status": "PROPOSED",
  "programId": "program-uuid",
  "startDate": "2026-10-01",
  "targetEndDate": "2027-02-28",
  "actualEndDate": "2027-02-20"
}
```

Required fields: `clientId` and `name`. `status` defaults to `PROPOSED`. Allowed statuses: `PROPOSED`, `ACTIVE`, `ON_HOLD`, `COMPLETED`, `CANCELLED`. `description` is at most 5000 chars; `phase` is at most 100 chars. Dates are optional ISO date strings. `programId` must belong to the same client. `targetEndDate` and `actualEndDate` cannot be before `startDate`. Project names are case-insensitively unique within a client.

PATCH accepts `name`, `description`, `phase`, `status`, `programId`, `startDate`, `targetEndDate`, and `actualEndDate`. Omit a field to leave it unchanged. Send `null` to clear nullable fields (`description`, `phase`, `programId`, or dates). `clientId` and `healthStatus` are not writable. `healthStatus` is assigned by the backend/database and should be treated as read-only.

## Resources

| Method | Path | Behavior |
|---|---|---|
| GET | `/resources` | List; filters: `search` (name or email contains), `department` (case-insensitive exact match); supports pagination. Each item includes `availability` and `_count` for `allocations` and `tasksOwned`. |
| GET | `/resources/:id` | One resource with `availability`, `skills` (skill name and proficiency), and `_count` of resource-related records. |
| POST | `/resources` | Create; responds `201` with resource and `availability` (may be `null`). |
| PATCH | `/resources/:id` | Update provided fields and/or availability; responds with resource and availability. |
| DELETE | `/resources/:id` | Delete; responds `204`. Refuses deletion when referenced. |

Create payload example:

```json
{
  "fullName": "Jordan Lee",
  "email": "jordan@example.com",
  "role": "Project Manager",
  "primaryDepartment": "Delivery",
  "availability": {
    "weeklyCapacityHours": 40,
    "timezone": "Asia/Kolkata",
    "maxSimultaneousProjects": 3
  }
}
```

Required fields: `fullName`, `email`, `role`, `primaryDepartment`. Email is trimmed, lowercased, and validated. Emails are case-insensitively unique. Optional `availability` fields: `weeklyCapacityHours` is greater than 0 and at most 80; `timezone` must be a valid IANA timezone; `maxSimultaneousProjects` is an integer from 1 to 20. If no availability is supplied on create, the API does not create an availability row. On PATCH, availability fields are upserted; omitted availability values are preserved if the row already exists and database defaults apply when it is first created. Availability cannot currently be removed through this API. `hourlyCost` is not accepted or editable.

## Allocations

| Method | Path | Behavior |
|---|---|---|
| GET | `/allocations` | List; filters: `resourceId`, `projectId`, `activeOn`, `from`, `to`; supports pagination. Each item includes compact `resource` and `project` relations. |
| GET | `/allocations/:id` | One allocation with compact resource and project relations, including the project's client. |
| POST | `/allocations` | Create; responds `201` with `{ allocation, warnings, plannedEffortHoursCalculated }`. |
| PATCH | `/allocations/:id` | Update; responds with `{ allocation, warnings }`. |
| DELETE | `/allocations/:id` | Delete; responds `204`. |

Create example:

```json
{
  "resourceId": "resource-uuid",
  "projectId": "project-uuid",
  "allocatedPercentage": 50,
  "startDate": "2026-10-19",
  "endDate": "2026-12-31"
}
```

`resourceId`, `projectId`, `allocatedPercentage`, `startDate`, and `endDate` are required. Percentage must be greater than 0 and at most 100. `plannedEffortHours` is optional, greater than 0 and at most 100000; if omitted on create, the API estimates it using weekly capacity (default 40 hours), allocation percentage, and weekdays in the inclusive date range. The estimate ignores leave and holidays. The response flag `plannedEffortHoursCalculated` tells the UI whether the estimate was generated.

`endDate` must be on or after `startDate`. The same resource cannot have overlapping allocations on the same project; this returns `409 ALLOCATION_OVERLAP`. Allocation above 100% across overlapping projects is saved but returns a warning; show warnings to the user without treating them as a failed save. Allocations on completed or cancelled projects also return a warning.

PATCH can change `allocatedPercentage`, `plannedEffortHours`, `startDate`, and `endDate`. Resource and project cannot be changed; end the old allocation and create a new one to move a resource. If dates or percentage change without a new `plannedEffortHours`, the existing effort is not recalculated and the response includes a warning. For list filters, `activeOn` returns records covering that date; `from` and `to` select allocations overlapping the inclusive window. If both are supplied, `to` cannot precede `from`.

## Roster CSV Import

The import endpoints use `multipart/form-data`, not JSON. Attach the CSV as field `file`. Maximum upload size is 5 MB; only `.csv` filenames are accepted. The CSV must include a header and at least one non-empty data row.

1. `POST /imports/roster/headers`: upload `file`. It writes nothing and responds with:

```json
{
  "headers": ["Name", "Email", "Role", "Department"],
  "rowCount": 12,
  "suggestedMapping": { "fullName": "Name", "email": "Email", "role": "Role", "department": "Department" },
  "missingRequired": []
}
```

2. `POST /imports/roster`: upload `file`; optionally attach `mapping` as a stringified JSON object in another multipart field. Mapping keys: `fullName`, `email`, `role`, `department`, `weeklyCapacityHours`; values are exact CSV header names. The first four fields are required. If mapping is omitted, the API suggests one based on common header synonyms. Without `?commit=true`, this is a dry run and writes nothing. The response is `{ committed: false, mapping, summary, rows }`; row actions can be `create`, `update`, `unchanged`, `duplicate`, or `reject`, with `reasons`, `warnings`, and optional `changes`.

3. To apply the reviewed plan, repeat the upload and mapping with `POST /imports/roster?commit=true`. The response includes `{ committed: true, mapping, summary, result, rows }`; `result` contains `syncJobId`, `created`, and `updated`. The import is transactional. Rejected or duplicate rows do not become resource changes. A supplied capacity must be greater than 0 and at most 80.

Example browser request:

```js
const body = new FormData();
body.append('file', file);
body.append('mapping', JSON.stringify({
  fullName: 'Name',
  email: 'Email',
  role: 'Role',
  department: 'Department'
}));

const response = await fetch(`${API_BASE}/imports/roster`, {
  method: 'POST',
  body
});
```

Do not manually set the multipart `Content-Type` header in a browser; the browser must add the boundary.

## Errors

Errors use this general shape; `details` is omitted when there are no details:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input",
    "details": {}
  }
}
```

Common status codes: `400` invalid input, `404` missing record or route, `409` duplicate/in-use/conflicting record, `500` unexpected server error, `503` health check cannot reach the database. Validation details are Zod's flattened error object. Display the API `message` where appropriate; use `code` for predictable UI handling. Specific conflict codes include `CLIENT_NAME_TAKEN`, `PROJECT_NAME_TAKEN`, `RESOURCE_EMAIL_TAKEN`, `CLIENT_IN_USE`, `PROJECT_IN_USE`, `RESOURCE_IN_USE`, and `ALLOCATION_OVERLAP`. Deletes return `204` with an empty body; do not try to parse JSON for those responses.

## Frontend Scope and Constraints

The implemented API covers health, clients, projects, resources, allocations, and roster CSV import only. Do not assume endpoints for programs, tasks, milestones, skills management, leave, dashboards, authentication, or analytics; those are not exposed in the current Express routes. Relationship counts and compact related records are read-only summary data, not separate API operations.

For collection screens, use server pagination and filters rather than assuming the response is a bare array. For allocation saves, inspect and display `warnings`. For destructive actions, handle `409` and show the server message/details because the record may still be referenced.