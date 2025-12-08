# API Documentation

## Authentication

All API endpoints (except auth endpoints) require authentication via NextAuth session cookie.

## Rate Limiting

- **Standard endpoints**: 100 requests per 15 minutes
- **Strict endpoints**: 20 requests per 15 minutes
- **Upload endpoints**: 10 requests per hour

Rate limit headers are included in responses:
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Remaining requests
- `X-RateLimit-Reset`: Timestamp when limit resets

---

## Core APIs

### Dashboard

#### `GET /api/dashboard/stats`
Get dashboard statistics for the current organisation.

**Response:**
```json
{
  "totalStudents": 54,
  "newStudentsThisMonth": 5,
  "studentGrowth": 10.5,
  "activeClasses": 3,
  "staffMembers": 6,
  "attendanceRate": 83,
  "attendanceGrowth": 2,
  "monthlyRevenue": 2950,
  "revenueGrowth": 15.5,
  "pendingInvoices": 5,
  "overduePayments": 10,
  "pendingApplications": 11,
  "attendanceTrend": [...],
  "paidThisMonth": 2500,
  "averagePaymentTime": 3.5
}
```

---

### Students

#### `GET /api/students`
Get list of students for the current organisation.

**Query Parameters:**
- `search` (optional): Search by name, email, or parent name
- `classId` (optional): Filter by class
- `status` (optional): Filter by status (ACTIVE, INACTIVE, ARCHIVED)

**Response:**
```json
[
  {
    "id": "student-id",
    "firstName": "Ahmed",
    "lastName": "Hassan",
    "age": 13,
    "parent": {
      "name": "Parent Name",
      "email": "parent@example.com"
    },
    "attendanceRate": 85,
    "status": "ACTIVE"
  }
]
```

#### `POST /api/students`
Create a new student.

**Request Body:**
```json
{
  "firstName": "Ahmed",
  "lastName": "Hassan",
  "dateOfBirth": "2010-05-15",
  "gender": "MALE",
  "classId": "class-id",
  "parentEmail": "parent@example.com",
  "parentName": "Parent Name",
  "parentPhone": "+44 7700 900123"
}
```

#### `GET /api/students/[id]`
Get student details.

#### `PATCH /api/students/[id]`
Update student information.

#### `POST /api/students/[id]/archive`
Archive a student.

---

### Classes

#### `GET /api/classes`
Get list of classes.

**Response:**
```json
[
  {
    "id": "class-id",
    "name": "Quran Recitation",
    "description": "Class description",
    "schedule": {
      "days": ["monday", "wednesday", "friday"],
      "startTime": "17:00",
      "endTime": "19:00"
    },
    "teacher": {
      "name": "Teacher Name",
      "email": "teacher@example.com"
    },
    "_count": {
      "StudentClass": 24
    }
  }
]
```

#### `POST /api/classes`
Create a new class.

**Request Body:**
```json
{
  "name": "Quran Recitation",
  "description": "Class description",
  "schedule": {
    "days": ["monday", "wednesday", "friday"],
    "startTime": "17:00",
    "endTime": "19:00"
  },
  "teacherId": "teacher-user-id",
  "monthlyFeeP": 5000
}
```

---

### Applications

#### `GET /api/applications`
Get list of student applications.

**Query Parameters:**
- `status` (optional): Filter by status (NEW, REVIEWED, ACCEPTED, REJECTED)

**Response:**
```json
[
  {
    "id": "app-id",
    "status": "NEW",
    "guardianName": "Parent Name",
    "guardianEmail": "parent@example.com",
    "guardianPhone": "+44 7700 900123",
    "submittedAt": "2025-11-20T10:00:00Z",
    "children": [
      {
        "firstName": "Ahmed",
        "lastName": "Hassan",
        "dob": "2010-05-15",
        "gender": "MALE"
      }
    ],
    "preferredClass": "Quran Recitation",
    "adminNotes": "Notes from admin"
  }
]
```

#### `PATCH /api/applications/[id]`
Update application status.

**Request Body:**
```json
{
  "status": "ACCEPTED",
  "adminNotes": "Application approved"
}
```

---

### Attendance

#### `POST /api/attendance/bulk`
Bulk update attendance for a class.

**Request Body:**
```json
{
  "classId": "class-id",
  "date": "2025-11-25",
  "records": [
    {
      "studentId": "student-id",
      "status": "PRESENT",
      "notes": "Optional notes"
    }
  ]
}
```

---

### Invoices

#### `GET /api/invoices`
Get list of invoices.

**Query Parameters:**
- `status` (optional): Filter by status (PENDING, PAID, OVERDUE, CANCELLED)
- `month` (optional): Filter by month (YYYY-MM)

**Response:**
```json
[
  {
    "id": "invoice-id",
    "invoiceNumber": "INV-2025-001",
    "student": {
      "firstName": "Ahmed",
      "lastName": "Hassan"
    },
    "amountP": 5000,
    "currency": "GBP",
    "status": "PENDING",
    "dueDate": "2025-12-01",
    "paidAt": null,
    "createdAt": "2025-11-01T00:00:00Z"
  }
]
```

#### `POST /api/invoices/generate-monthly`
Generate monthly invoices for all active students.

**Request Body:**
```json
{
  "month": 11,
  "year": 2025
}
```

#### `POST /api/invoices/[id]/record-cash`
Record a cash payment for an invoice.

**Request Body:**
```json
{
  "amountP": 5000,
  "paymentDate": "2025-11-25"
}
```

---

### Payments

#### `GET /api/payments`
Get payment records.

**Query Parameters:**
- `status` (optional): Filter by status
- `month` (optional): Filter by month (YYYY-MM)

#### `POST /api/payments/stripe/pay-now`
Process a card payment for an invoice.

**Request Body:**
```json
{
  "invoiceId": "invoice-id",
  "paymentMethodId": "pm_xxx"
}
```

#### `POST /api/payments/stripe/setup-intent`
Create a setup intent to save payment method.

**Response:**
```json
{
  "clientSecret": "seti_xxx_secret_xxx"
}
```

#### `POST /api/payments/stripe/autopay-toggle`
Toggle autopay for a parent account.

**Request Body:**
```json
{
  "enabled": true
}
```

---

### Messages

#### `GET /api/messages`
Get sent messages.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)

#### `POST /api/messages/send`
Send an announcement message.

**Request Body:**
```json
{
  "subject": "Important Announcement",
  "content": "Message content",
  "audience": "ALL",
  "channel": "EMAIL",
  "targets": {
    "classIds": ["class-id-1", "class-id-2"]
  }
}
```

**Audience Options:**
- `ALL`: All parents
- `BY_CLASS`: Specific classes
- `INDIVIDUAL`: Individual parents

**Channel Options:**
- `EMAIL`: Email only
- `WHATSAPP`: WhatsApp only
- `BOTH`: Both email and WhatsApp

---

### Calendar

#### `GET /api/events`
Get calendar events.

**Query Parameters:**
- `startDate`: Start date (ISO string)
- `endDate`: End date (ISO string)
- `types` (optional): Filter by types (comma-separated)

#### `GET /api/calendar/ics`
Export calendar as ICS file.

**Query Parameters:**
- `months` (optional): Number of months to export (default: 12)

---

### Gift Aid

#### `GET /api/gift-aid`
Get gift aid declarations.

**Query Parameters:**
- `startDate`: Start date (YYYY-MM-DD)
- `endDate`: End date (YYYY-MM-DD)
- `status`: Filter by status (YES, NOT_SURE, NO)

#### `POST /api/gift-aid/parent-declaration`
Submit gift aid declaration.

**Request Body:**
```json
{
  "status": "YES",
  "declarationDate": "2025-11-25"
}
```

#### `GET /api/gift-aid/download`
Download gift aid schedule (CSV).

---

### Support

#### `GET /api/support/tickets`
Get support tickets.

#### `POST /api/support/tickets`
Create a support ticket.

**Request Body:**
```json
{
  "subject": "Issue with payment",
  "message": "Description of the issue",
  "priority": "MEDIUM"
}
```

---

## Owner APIs

### `GET /api/owner/dashboard`
Get platform-wide dashboard statistics (Owner only).

### `GET /api/owner/orgs`
Get list of all organisations (Owner only).

### `GET /api/owner/system-health`
Get system health metrics (Owner only).

---

## Webhooks

### `POST /api/webhooks/stripe`
Stripe webhook endpoint. Handles:
- `customer.subscription.*` events
- `invoice.*` events
- `payment_intent.*` events

**Headers Required:**
- `stripe-signature`: Stripe webhook signature

### `GET/POST /api/webhooks/whatsapp`
WhatsApp webhook endpoint for message delivery status.

---

## Cron Jobs

### `POST /api/cron/nightly-usage`
Report usage to Stripe for metered billing.

**Headers Required:**
- `Authorization: Bearer ${CRON_SECRET}`

### `POST /api/cron/billing`
Process billing for organisations.

**Headers Required:**
- `Authorization: Bearer ${CRON_SECRET}`

### `POST /api/cron/check-overdue`
Check for overdue payments and update statuses.

**Headers Required:**
- `Authorization: Bearer ${CRON_SECRET}`

---

## Error Responses

All errors follow this format:

```json
{
  "error": "Error message",
  "details": "Additional details (development only)"
}
```

**Status Codes:**
- `200`: Success
- `400`: Bad Request
- `401`: Unauthorized
- `403`: Forbidden
- `404`: Not Found
- `429`: Too Many Requests (rate limited)
- `500`: Internal Server Error

---

## Authentication Flow

1. User signs in via `POST /api/auth/signin`
2. NextAuth creates session cookie
3. All subsequent requests include session cookie
4. Middleware validates session and routes to correct portal

---

**Last Updated**: 2025-11-25

