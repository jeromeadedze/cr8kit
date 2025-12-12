# Quick Email Setup Guide

## Current Status

✅ **Email template is ready** - The booking approval email now includes:
- Complete receipt with breakdown
- Pickup location and time
- Booking number
- Total amount
- Rental dates
- Professional HTML formatting

## Quick Setup Options

### Option 1: Use Resend (Recommended - Easiest)

1. **Sign up for Resend** (free tier: 3,000 emails/month)
   - Go to https://resend.com
   - Create account
   - Get your API key

2. **Create Supabase Edge Function**
   - In Supabase Dashboard → Edge Functions
   - Create new function: `send-email`
   - Use the code from `EMAIL_SETUP_GUIDE.md`

3. **Add API Key as Secret**
   - In Supabase Dashboard → Edge Functions → Secrets
   - Add: `RESEND_API_KEY` = your Resend API key

4. **Done!** The code will automatically use the Edge Function.

### Option 2: Use Console Log (For Testing)

The email HTML is already logged to the browser console. You can:
1. Open browser console (F12)
2. Approve a booking
3. Copy the HTML from console
4. Send manually via any email service

### Option 3: Use Direct API Call

Update `sendBookingApprovalEmail` function to call your email service directly:

```javascript
// Example with Resend (direct API call)
const response = await fetch('https://api.resend.com/emails', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${RESEND_API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    from: 'Cr8Kit <noreply@yourdomain.com>',
    to: renter.email,
    subject: `Booking Approved - ${equipment.name}`,
    html: emailHtml
  })
});
```

## What's Included in the Email

✅ **Receipt Information:**
- Booking number
- Equipment name
- Rental dates (formatted nicely)
- Duration (days)
- Price per day
- Subtotal
- Service fee (10%)
- Insurance (5%)
- **Total amount**

✅ **Pickup Details:**
- Date
- Time
- Location (address)

✅ **Next Steps:**
- Payment instructions
- What to bring
- Link to view booking

## Testing

1. Go to "My Listings" page
2. Click "Requests" tab
3. Click "Approve" on a pending request
4. Fill in pickup location and time
5. Click "Approve & Send"
6. Check:
   - Browser console for email HTML (if Edge Function not set up)
   - User's email inbox (if Edge Function is set up)
   - Notifications table in database

## Troubleshooting

**Error: "An error occurred. Please try again."**
- Check browser console for detailed error
- Verify booking data exists
- Check network tab for API errors

**Email not sending:**
- Check if Edge Function is deployed
- Verify API keys are correct
- Check Edge Function logs in Supabase Dashboard

**Email sent but not received:**
- Check spam folder
- Verify email address is correct
- Check email service delivery logs

## Next Steps

1. Set up email service (Resend recommended)
2. Deploy Edge Function
3. Test with a real booking
4. Monitor email delivery

The email template is production-ready and includes all receipt information!

