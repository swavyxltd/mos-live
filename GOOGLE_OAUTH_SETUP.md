# Google OAuth Setup Guide

## Current Issue

**Error**: "The OAuth client was not found" or "invalid_client"

This means the Google OAuth client ID needs to be properly configured in Google Cloud Console.

## Fix Steps

### 1. Go to Google Cloud Console

1. Visit: https://console.cloud.google.com/
2. Select your project (or create a new one)
3. Navigate to: **APIs & Services** → **Credentials**

### 2. Check/Create OAuth 2.0 Client

1. Look for an OAuth 2.0 Client ID: `1003095199607-o5h3234ud1t92upec21fs294fbp1aihp.apps.googleusercontent.com`
2. If it doesn't exist, create a new one:
   - Click **Create Credentials** → **OAuth client ID**
   - Application type: **Web application**
   - Name: `Madrasah OS`

### 3. Configure Authorized Redirect URIs

**Critical:** Add these redirect URIs to your Google OAuth client:

#### For Production:
```
https://mos-live.vercel.app/api/auth/callback/google
```

#### For Preview/Development:
```
https://madrasah-live-i4b29lhff-saif-alis-projects-75a446fe.vercel.app/api/auth/callback/google
https://madrasah-live.vercel.app/api/auth/callback/google
```

#### For Local Development:
```
http://localhost:3000/api/auth/callback/google
```

### 4. Get Client ID and Secret

1. After creating/configuring, copy:
   - **Client ID**: `1003095199607-o5h3234ud1t92upec21fs294fbp1aihp.apps.googleusercontent.com`
   - **Client Secret**: Starts with `GOCSPX-...`

### 5. Update Environment Variables

Make sure these are set in Vercel:

```env
GOOGLE_CLIENT_ID=1003095199607-o5h3234ud1t92upec21fs294fbp1aihp.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
NEXTAUTH_URL=https://mos-live.vercel.app
```

### 6. Enable Google+ API (if needed)

1. Go to **APIs & Services** → **Library**
2. Search for "Google+ API" or "Google Identity"
3. Enable it if not already enabled

### 7. Test Again

1. Redeploy your Vercel app after updating redirect URIs
2. Try Google login again

## Quick Checklist

- [ ] OAuth 2.0 Client ID exists in Google Cloud Console
- [ ] Authorized redirect URIs include your Vercel URLs
- [ ] Client ID matches `.env` file
- [ ] Client Secret matches `.env` file
- [ ] `NEXTAUTH_URL` is set correctly in Vercel
- [ ] Google+ API or Google Identity API is enabled

## Alternative: Use Wildcard Domain (Not Recommended)

You can add a wildcard for preview deployments:
```
https://*.vercel.app/api/auth/callback/google
```

But Google may not allow this. Better to add specific domains.

## Troubleshooting

### Still getting "invalid_client"?
- Double-check the Client ID is correct (no spaces, exact match)
- Verify redirect URIs match exactly (including https/http, trailing slashes)
- Wait a few minutes after updating - Google caches settings

### "redirect_uri_mismatch"?
- The redirect URI in the request doesn't match any authorized URI
- Check that `NEXTAUTH_URL` matches one of your configured domains

### Works locally but not on Vercel?
- Make sure Vercel environment variables are set
- Check that `NEXTAUTH_URL` in Vercel matches your deployment domain

