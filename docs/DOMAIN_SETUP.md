# Domain & SSL Setup Guide

This guide covers setting up custom domains and SSL certificates for Madrasah OS.

## Overview

Madrasah OS supports multiple portals:
- **Staff Portal**: `app.madrasah.io` (or your domain)
- **Parent Portal**: `parent.madrasah.io` (or your domain)
- **Auth Portal**: Can use main domain or subdomain

Vercel automatically provides SSL certificates for all domains.

---

## 1. Domain Configuration in Vercel

### Step 1: Add Domain to Vercel Project

1. Go to Vercel Dashboard → Your Project → Settings → Domains
2. Click "Add Domain"
3. Enter your domain (e.g., `app.madrasah.io`)
4. Click "Add"

### Step 2: Configure DNS Records

Vercel will show you the DNS records to add:

**For Root Domain** (e.g., `madrasah.io`):
```
Type: A
Name: @
Value: 76.76.21.21
```

**For Subdomain** (e.g., `app.madrasah.io`):
```
Type: CNAME
Name: app
Value: cname.vercel-dns.com
```

### Step 3: Verify Domain

1. Add the DNS records in your domain registrar (GoDaddy, Namecheap, etc.)
2. Wait for DNS propagation (can take up to 48 hours, usually < 1 hour)
3. Vercel will automatically verify and issue SSL certificate

---

## 2. Multiple Portal Setup

### Option A: Subdomains (Recommended)

**Staff Portal**: `app.madrasah.io`
**Parent Portal**: `parent.madrasah.io`
**Main Domain**: `madrasah.io` (redirects to staff portal)

**DNS Records:**
```
Type: CNAME
Name: app
Value: cname.vercel-dns.com

Type: CNAME
Name: parent
Value: cname.vercel-dns.com
```

**Environment Variables:**
```env
NEXTAUTH_URL=https://app.madrasah.io
APP_BASE_URL=https://app.madrasah.io
PARENT_PORTAL_URL=https://parent.madrasah.io
```

### Option B: Path-Based Routing

**Staff Portal**: `madrasah.io/app`
**Parent Portal**: `madrasah.io/parent`

This requires middleware configuration changes (not recommended).

---

## 3. SSL Certificate

### Automatic SSL (Vercel)

Vercel automatically:
- Issues SSL certificates via Let's Encrypt
- Renews certificates automatically
- Provides wildcard certificates for subdomains

**No action required** - SSL is automatic once domain is verified.

### Verify SSL

1. Visit your domain in browser
2. Check for padlock icon
3. Click padlock → Certificate → Verify details

### Test SSL Rating

Use SSL Labs to test:
1. Go to [SSL Labs SSL Test](https://www.ssllabs.com/ssltest/)
2. Enter your domain
3. Wait for test to complete
4. Aim for **A+ rating**

---

## 4. Environment Variables Update

After adding domains, update environment variables in Vercel:

### Required Updates

```env
# Update these in Vercel Dashboard → Settings → Environment Variables
NEXTAUTH_URL=https://app.madrasah.io
APP_BASE_URL=https://app.madrasah.io
PARENT_PORTAL_URL=https://parent.madrasah.io  # If using separate subdomain
```

### For Each Environment

- **Production**: Use production domains
- **Preview**: Can use preview URLs or test domains
- **Development**: Use `http://localhost:3000`

---

## 5. DNS Configuration by Registrar

### GoDaddy

1. Log in to GoDaddy
2. Go to DNS Management
3. Add CNAME record:
   - **Name**: `app`
   - **Value**: `cname.vercel-dns.com`
   - **TTL**: 600 (or default)

### Namecheap

1. Log in to Namecheap
2. Go to Domain List → Manage
3. Go to Advanced DNS
4. Add CNAME record:
   - **Host**: `app`
   - **Value**: `cname.vercel-dns.com`
   - **TTL**: Automatic

### Cloudflare

1. Log in to Cloudflare
2. Select your domain
3. Go to DNS → Records
4. Add CNAME record:
   - **Name**: `app`
   - **Target**: `cname.vercel-dns.com`
   - **Proxy status**: Proxied (orange cloud) or DNS only (gray cloud)

**Note**: If using Cloudflare proxy, Vercel will see Cloudflare IPs. This is fine.

---

## 6. Domain Verification

### Check DNS Propagation

Use tools to verify DNS records:
- [DNS Checker](https://dnschecker.org/)
- [What's My DNS](https://www.whatsmydns.net/)

Enter your domain and check if CNAME/A records are propagated globally.

### Verify in Vercel

1. Go to Vercel Dashboard → Settings → Domains
2. Check domain status:
   - ✅ **Valid**: Domain is configured correctly
   - ⏳ **Pending**: Waiting for DNS propagation
   - ❌ **Invalid**: DNS records incorrect

---

## 7. Redirects Configuration

### Redirect Root to Staff Portal

In `vercel.json` or `next.config.ts`:

```json
{
  "redirects": [
    {
      "source": "/",
      "destination": "https://app.madrasah.io",
      "permanent": true
    }
  ]
}
```

Or in `next.config.ts`:

```typescript
async redirects() {
  return [
    {
      source: '/',
      destination: 'https://app.madrasah.io',
      permanent: true,
    },
  ]
}
```

---

## 8. Testing Domain Setup

### Test Checklist

- [ ] Domain resolves to Vercel (check DNS)
- [ ] SSL certificate is active (padlock icon)
- [ ] Can access staff portal: `https://app.madrasah.io`
- [ ] Can access parent portal: `https://parent.madrasah.io`
- [ ] Authentication works with new domain
- [ ] Stripe webhooks work with new domain
- [ ] Email links use correct domain

### Test Script

Use the deployment verification script:
```bash
PRODUCTION_URL=https://app.madrasah.io npm run verify-deployment
```

---

## 9. Common Issues

### Issue: Domain Not Resolving

**Solution:**
1. Verify DNS records are correct
2. Wait for DNS propagation (up to 48 hours)
3. Check DNS propagation with DNS checker tools
4. Clear DNS cache: `sudo dscacheutil -flushcache` (macOS)

### Issue: SSL Certificate Not Issued

**Solution:**
1. Verify DNS records are correct
2. Wait for Vercel to issue certificate (usually < 5 minutes)
3. Check domain status in Vercel Dashboard
4. Contact Vercel support if stuck

### Issue: Wrong Portal Loading

**Solution:**
1. Check `NEXTAUTH_URL` environment variable
2. Verify middleware routing logic
3. Check host-based routing configuration

### Issue: Mixed Content Warnings

**Solution:**
1. Ensure all resources use HTTPS
2. Check for hardcoded HTTP URLs
3. Update `APP_BASE_URL` to use HTTPS

---

## 10. Production Checklist

Before going live:

- [ ] All domains added to Vercel
- [ ] DNS records configured correctly
- [ ] DNS propagation verified globally
- [ ] SSL certificates issued and active
- [ ] Environment variables updated
- [ ] Tested staff portal access
- [ ] Tested parent portal access
- [ ] Tested authentication flow
- [ ] Verified Stripe webhooks work
- [ ] Tested email links
- [ ] SSL Labs rating is A or A+
- [ ] Redirects configured (if needed)

---

## 11. Maintenance

### Domain Renewal

- Domains must be renewed annually
- Set up auto-renewal with registrar
- Vercel SSL certificates auto-renew

### DNS Changes

- DNS changes can take up to 48 hours to propagate
- Plan DNS changes during low-traffic periods
- Test changes in staging first

---

## Support

- **Vercel Docs**: https://vercel.com/docs/concepts/projects/domains
- **DNS Issues**: Contact your domain registrar
- **SSL Issues**: Contact Vercel support

---

**Last Updated**: 2025-11-25

