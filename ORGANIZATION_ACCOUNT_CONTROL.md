# Organization Account Control System

## Overview

The Organization Account Control System allows platform administrators to manage organization account status, including the ability to pause, suspend, and reactivate organization accounts. When an organization is paused or suspended, all associated admin, staff, and teacher accounts are automatically locked until the organization is reactivated.

## Account Statuses

### 1. ACTIVE
- **Description**: Normal operation, all accounts accessible
- **Access**: Full access to all features for admin, staff, teachers, students, and parents
- **Default**: New organizations start in ACTIVE status

### 2. PAUSED
- **Description**: Temporarily locked due to payment issues or administrative action
- **Access**: 
  - ❌ Admin, staff, and teacher accounts are locked
  - ✅ Students and parents retain access to their accounts
- **Triggers**: Manual pause, 2+ consecutive payment failures
- **Reactivation**: Can be reactivated by platform administrator

### 3. SUSPENDED
- **Description**: Permanently locked due to policy violations or repeated failures
- **Access**: 
  - ❌ Admin, staff, and teacher accounts are permanently locked
  - ✅ Students and parents retain access to their accounts
- **Triggers**: Manual suspension, 3+ consecutive payment failures
- **Reactivation**: Requires manual review and approval

## Database Schema Changes

### Organization Model Updates
```prisma
model Org {
  // ... existing fields ...
  
  // Account Status Management
  status            String   @default("ACTIVE") // ACTIVE, SUSPENDED, PAUSED
  suspendedAt       DateTime?
  suspendedReason   String?
  pausedAt          DateTime?
  pausedReason      String?
  lastPaymentDate   DateTime?
  paymentFailureCount Int    @default(0)
  autoSuspendEnabled Boolean @default(true)
}
```

## Middleware Protection

The system includes middleware that automatically checks organization status and redirects locked users to appropriate pages:

### Redirect Logic
- **Suspended Organizations**: Redirect to `/auth/account-suspended`
- **Paused Organizations**: Redirect to `/auth/account-paused`
- **Active Organizations**: Normal access granted

### Affected User Types
- ✅ **Students**: Always retain access regardless of organization status
- ✅ **Parents**: Always retain access regardless of organization status
- ❌ **Admins**: Locked when organization is paused/suspended
- ❌ **Staff**: Locked when organization is paused/suspended
- ❌ **Teachers**: Locked when organization is paused/suspended

## API Endpoints

### 1. Pause Organization
```
POST /api/orgs/[orgId]/pause
```
**Body:**
```json
{
  "reason": "Account paused due to payment issues"
}
```

### 2. Suspend Organization
```
POST /api/orgs/[orgId]/suspend
```
**Body:**
```json
{
  "reason": "Account suspended due to policy violations"
}
```

### 3. Reactivate Organization
```
POST /api/orgs/[orgId]/reactivate
```

### 4. Payment Failure Webhook
```
POST /api/webhooks/payment-failure
```
**Body:**
```json
{
  "organizationId": "org_123",
  "organizationName": "Leicester Islamic Centre",
  "failureReason": "Insufficient funds",
  "amount": 98,
  "failureDate": "2024-12-05T10:30:00Z"
}
```

### 5. Payment Success Webhook
```
POST /api/webhooks/payment-success
```
**Body:**
```json
{
  "organizationId": "org_123",
  "amount": 98
}
```

## Automatic Suspension Logic

### Payment Failure Thresholds
- **2 Failures**: Organization automatically paused
- **3+ Failures**: Organization automatically suspended
- **Success**: Failure count reset to 0

### Auto-Suspend Conditions
- Organization has `autoSuspendEnabled: true`
- 3+ failed payments in the last 30 days
- Consecutive payment failures

## User Interface

### Owner Dashboard
- **Organization Management Modal**: New "Account" tab
- **Account Status Display**: Visual indicators for ACTIVE/PAUSED/SUSPENDED
- **Action Buttons**: Pause, Suspend, Reactivate with confirmation dialogs
- **Reason Input**: Optional reason field for status changes

### Locked User Pages
- **Account Suspended Page**: `/auth/account-suspended`
- **Account Paused Page**: `/auth/account-paused`
- **Support Information**: Contact details for assistance
- **Clear Messaging**: Explains what each status means

## Security Considerations

### Authorization
- Only platform administrators (super admins) can change organization status
- All status changes are logged in audit logs
- Confirmation dialogs for destructive actions

### Data Protection
- Student and parent data remains accessible during suspensions
- Only admin/staff/teacher accounts are locked
- Payment history and audit logs are preserved

## Monitoring and Logging

### Audit Logs
All organization status changes are logged with:
- Action type (ORG_PAUSED, ORG_SUSPENDED, ORG_REACTIVATED)
- User who performed the action
- Reason for the action
- List of affected users
- Timestamp and details

### Payment Tracking
- Payment failure count tracking
- Last successful payment date
- Automatic status updates based on payment history

## Implementation Steps

1. ✅ **Database Schema**: Added organization status fields
2. ✅ **Middleware**: Account locking and redirect logic
3. ✅ **API Endpoints**: Pause, suspend, reactivate endpoints
4. ✅ **UI Components**: Account management interface
5. ✅ **Webhook Handlers**: Automatic payment failure processing
6. ✅ **Status Pages**: User-friendly locked account pages

## Usage Examples

### Manual Account Pause
```typescript
// Pause organization due to payment issues
const response = await fetch('/api/orgs/org_123/pause', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    reason: 'Account paused due to repeated payment failures'
  })
})
```

### Automatic Suspension
```typescript
// Webhook triggered by payment processor
const response = await fetch('/api/webhooks/payment-failure', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    organizationId: 'org_123',
    organizationName: 'Leicester Islamic Centre',
    failureReason: 'Card declined',
    amount: 98,
    failureDate: new Date().toISOString()
  })
})
```

## Benefits

1. **Payment Control**: Automatic handling of payment failures
2. **Account Security**: Immediate locking of compromised accounts
3. **User Experience**: Clear messaging and support information
4. **Administrative Control**: Manual override capabilities
5. **Audit Trail**: Complete logging of all actions
6. **Flexible Status**: Different levels of restriction (pause vs suspend)

This system provides comprehensive control over organization accounts while maintaining access for students and parents, ensuring educational continuity even during administrative actions.
