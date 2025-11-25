# Environment Variables Reference

Complete reference for all environment variables used in Madrasah OS.

## Quick Validation

Run this to validate all environment variables:
```bash
npm run validate-env
```

---

## Core Configuration

### `NEXTAUTH_URL`
**Required**: Yes  
**Example**: `https://app.madrasah.io`  
**Description**: The canonical URL of your application. Used for OAuth callbacks and email links.

**Production**: Must match your production domain  
**Development**: `http://localhost:3000`

---

### `NEXTAUTH_SECRET`
**Required**: Yes  
**Example**: `your-random-secret-key-here`  
**Description**: Secret used to encrypt JWT tokens and session cookies.

**Generate**: `openssl rand -base64 32`  
**Length**: Minimum 32 characters  
**Security**: Never commit to git

---

### `APP_BASE_URL`
**Required**: Yes  
**Example**: `https://app.madrasah.io`  
**Description**: Base URL for the application. Used for generating absolute URLs.

**Production**: Must match `NEXTAUTH_URL`  
**Development**: `http://localhost:3000`

---

### `NODE_ENV`
**Required**: Yes  
**Example**: `production`  
**Description**: Node.js environment mode.

**Values**: `development`, `production`, `test`  
**Production**: Must be `production`

---

## Database

### `DATABASE_URL`
**Required**: Yes (or `POSTGRES_PRISMA_URL`)  
**Example**: `postgresql://user:password@host:5432/dbname?sslmode=require`  
**Description**: PostgreSQL connection string.

**SSL**: Must include `?sslmode=require` in production  
**Format**: `postgresql://[user]:[password]@[host]:[port]/[database]?[params]`

---

### `POSTGRES_PRISMA_URL`
**Required**: Yes (or `DATABASE_URL`)  
**Example**: `postgresql://user:password@host:5432/dbname?sslmode=require&pgbouncer=true`  
**Description**: Prisma-specific connection string (for connection pooling).

**Vercel Postgres**: Automatically set when you create Postgres database  
**SSL**: Must include `?sslmode=require` in production

---

## Stripe

### `STRIPE_SECRET_KEY`
**Required**: Yes  
**Example**: `sk_live_51...` or `sk_test_51...`  
**Description**: Stripe secret API key.

**Production**: Must use `sk_live_` key  
**Test**: Use `sk_test_` key for development  
**Get**: Stripe Dashboard → Developers → API keys

---

### `STRIPE_PRICE_ID`
**Required**: Yes  
**Example**: `price_1234567890`  
**Description**: Stripe Price ID for metered billing subscriptions.

**Get**: Stripe Dashboard → Products → Create Price → Copy Price ID

---

### `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
**Required**: Yes  
**Example**: `pk_live_51...` or `pk_test_51...`  
**Description**: Stripe publishable key (exposed to client).

**Production**: Must use `pk_live_` key  
**Test**: Use `pk_test_` key for development  
**Get**: Stripe Dashboard → Developers → API keys

---

### `STRIPE_WEBHOOK_SECRET`
**Required**: Yes (for production)  
**Example**: `whsec_1234567890...`  
**Description**: Webhook signing secret for verifying Stripe webhook events.

**Get**: Stripe Dashboard → Webhooks → Add endpoint → Copy signing secret  
**Format**: Starts with `whsec_`

---

## Vercel Blob Storage

### `BLOB_READ_WRITE_TOKEN`
**Required**: Yes  
**Example**: `vercel_blob_rw_1234567890...`  
**Description**: Token for reading/writing to Vercel Blob Storage.

**Auto-set**: Automatically set when you create Blob Storage in Vercel  
**Get**: Vercel Dashboard → Storage → Blob → Settings → Tokens

---

## Email (Resend)

### `RESEND_API_KEY`
**Required**: Yes  
**Example**: `re_1234567890...`  
**Description**: Resend API key for sending emails.

**Get**: Resend Dashboard → API Keys → Create API Key  
**Format**: Starts with `re_`

---

### `RESEND_FROM`
**Required**: Yes  
**Example**: `Madrasah OS <noreply@madrasah.io>`  
**Description**: Default sender email address.

**Format**: `Name <email@domain.com>` or just `email@domain.com`  
**Domain**: Must be verified in Resend Dashboard

---

## WhatsApp/Meta (Optional)

### `META_APP_ID`
**Required**: No  
**Example**: `1234567890123456`  
**Description**: Meta App ID for WhatsApp Cloud API.

**Get**: Meta for Developers → Your App → Settings → Basic

---

### `META_APP_SECRET`
**Required**: No  
**Example**: `your-app-secret`  
**Description**: Meta App Secret for WhatsApp Cloud API.

**Get**: Meta for Developers → Your App → Settings → Basic

---

### `META_GRAPH_VERSION`
**Required**: No  
**Default**: `v18.0`  
**Description**: Meta Graph API version.

**Update**: Check [Meta Graph API Changelog](https://developers.facebook.com/docs/graph-api/changelog)

---

### `META_GRAPH_BASE`
**Required**: No  
**Default**: `https://graph.facebook.com`  
**Description**: Base URL for Meta Graph API.

---

### `WHATSAPP_EMBEDDED_REDIRECT_URL`
**Required**: No  
**Example**: `https://app.madrasah.io/integrations/whatsapp/callback`  
**Description**: OAuth redirect URL for WhatsApp integration.

**Production**: Must match your production domain  
**Development**: `http://localhost:3000/integrations/whatsapp/callback`

---

### `WHATSAPP_VERIFY_TOKEN`
**Required**: No  
**Example**: `your-random-verify-token`  
**Description**: Token for verifying WhatsApp webhook requests.

**Generate**: Random secure string  
**Security**: Never commit to git

---

## Development Only

### `WHATSAPP_DEV_ACCESS_TOKEN`
**Required**: No (development only)  
**Description**: Development access token for WhatsApp (bypasses OAuth).

**Get**: Meta for Developers → Tools → Graph API Explorer

---

### `WHATSAPP_DEV_PHONE_NUMBER_ID`
**Required**: No (development only)  
**Description**: Development phone number ID for WhatsApp.

**Get**: Meta for Developers → WhatsApp → API Setup

---

### `WHATSAPP_DEV_WABA_ID`
**Required**: No (development only)  
**Description**: Development WhatsApp Business Account ID.

**Get**: Meta for Developers → WhatsApp → API Setup

---

## Cron Jobs

### `CRON_SECRET`
**Required**: Yes (if using cron endpoints)  
**Example**: `your-random-cron-secret`  
**Description**: Secret for securing cron job endpoints.

**Generate**: `openssl rand -base64 32`  
**Security**: Never commit to git  
**Usage**: Include in cron job requests as `Authorization: Bearer ${CRON_SECRET}`

---

## Portal URLs (Optional)

### `PARENT_PORTAL_URL`
**Required**: No  
**Example**: `https://parent.madrasah.io`  
**Description**: URL for parent portal (if using separate subdomain).

**Default**: Uses `APP_BASE_URL` with `?portal=parent` query param

---

## Environment-Specific Setup

### Development (.env.local)

```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=dev-secret-key
APP_BASE_URL=http://localhost:3000
NODE_ENV=development
DATABASE_URL=postgresql://user:password@localhost:5432/madrasah_dev
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
RESEND_API_KEY=re_...
RESEND_FROM=Madrasah OS <noreply@example.com>
```

### Production (Vercel)

Set in Vercel Dashboard → Settings → Environment Variables:

1. Select environment: **Production**
2. Add each variable
3. Click "Save"
4. Redeploy to apply changes

---

## Security Best Practices

1. **Never commit secrets to git**
   - Use `.env.local` for local development
   - Add `.env.local` to `.gitignore`

2. **Use different keys for dev/prod**
   - Never use production keys in development
   - Never use test keys in production

3. **Rotate secrets regularly**
   - Change `NEXTAUTH_SECRET` periodically
   - Rotate API keys if compromised

4. **Use strong secrets**
   - Minimum 32 characters for `NEXTAUTH_SECRET`
   - Use `openssl rand -base64 32` to generate

5. **Limit access**
   - Only team members who need access
   - Use Vercel team permissions

---

## Validation

### Automated Validation

```bash
npm run validate-env
```

This checks:
- All required variables are set
- Stripe keys are in correct format
- Database URL includes SSL
- Secrets are long enough
- Email format is valid

### Manual Checklist

- [ ] All required variables set
- [ ] Production keys (not test keys)
- [ ] SSL enabled in database URL
- [ ] Domain matches `NEXTAUTH_URL`
- [ ] Webhook secrets configured
- [ ] Email domain verified in Resend

---

## Troubleshooting

### Variable Not Working

1. Check variable name (case-sensitive)
2. Verify it's set in correct environment (Production/Preview/Development)
3. Redeploy after adding variables
4. Check for typos

### Test vs Production Keys

- **Test keys**: Start with `sk_test_` or `pk_test_`
- **Production keys**: Start with `sk_live_` or `pk_live_`
- **Never mix**: Don't use test keys in production

### Database Connection Issues

- Verify `DATABASE_URL` or `POSTGRES_PRISMA_URL` is set
- Check SSL mode: `?sslmode=require`
- Verify database is accessible
- Check connection pool settings

---

## Support

- **Vercel Environment Variables**: https://vercel.com/docs/concepts/projects/environment-variables
- **Stripe API Keys**: https://stripe.com/docs/keys
- **Resend API**: https://resend.com/docs/api-reference/overview

---

**Last Updated**: 2025-11-25

