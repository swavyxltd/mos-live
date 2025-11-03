# Email Delivery Troubleshooting

## Quick Checks:

1. **Check if user exists in database:**
   - The API always returns success (for security), even if user doesn't exist
   - Verify the email `swavyxltd@gmail.com` exists in your User table

2. **Check Resend dashboard:**
   - Go to https://resend.com/emails
   - Look for recent emails sent to `swavyxltd@gmail.com`
   - Check delivery status and any bounce/spam issues

3. **Check spam folder:**
   - Gmail sometimes filters reset emails
   - Check spam/promotions folder

4. **Verify Resend domain:**
   - The email is sent from `noreply@madrasah.io` (or your RESEND_FROM)
   - Make sure this domain is verified in Resend dashboard

5. **Check Vercel logs:**
   - Look for any errors in the production logs
   - Check if `RESEND_API_KEY` is properly set

6. **Demo mode check:**
   - If `RESEND_API_KEY` is missing or set to `re_demo_key`, emails won't send
   - Emails will only be logged to console in demo mode

