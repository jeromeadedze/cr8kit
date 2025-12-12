# Supabase Edge Function Setup - Step by Step

This guide will help you set up the email sending Edge Function using Resend.

## Prerequisites

- Supabase account and project
- Resend account (free tier available)
- Supabase CLI installed (optional, but recommended)

## Step 1: Sign Up for Resend

1. Go to https://resend.com
2. Click "Sign Up" (free tier: 3,000 emails/month)
3. Verify your email
4. Go to **API Keys** in the dashboard
5. Click **Create API Key**
6. Give it a name (e.g., "Cr8Kit Production")
7. **Copy the API key** (starts with `re_`) - you'll need this later

## Step 2: Set Up Edge Function in Supabase Dashboard

### Option A: Using Supabase Dashboard (No CLI Required)

1. **Go to Supabase Dashboard**
   - Visit https://supabase.com/dashboard
   - Select your project: `ibvzepzwoytvhrnllywi`

2. **Create Edge Function**
   - Go to **Edge Functions** in the left sidebar
   - Click **Create a new function**
   - Name it: `send-email`
   - Click **Create function**

3. **Add the Code**
   - Copy the code from `supabase/functions/send-email/index.ts`
   - Paste it into the editor
   - Click **Deploy**

4. **Add Secret (API Key)**
   - In Edge Functions, go to **Secrets** tab
   - Click **Add Secret**
   - Name: `RESEND_API_KEY`
   - Value: Paste your Resend API key (from Step 1)
   - Click **Save**

5. **Done!** The function is now ready to use.

### Option B: Using Supabase CLI (Advanced)

1. **Install Supabase CLI**
   ```bash
   # macOS
   brew install supabase/tap/supabase
   
   # Or download from: https://github.com/supabase/cli/releases
   ```

2. **Login**
   ```bash
   supabase login
   ```

3. **Link Project**
   ```bash
   cd /Users/adedze/Desktop/Cr8kit
   supabase link --project-ref ibvzepzwoytvhrnllywi
   ```

4. **Set Secret**
   ```bash
   supabase secrets set RESEND_API_KEY=re_your_api_key_here
   ```

5. **Deploy Function**
   ```bash
   supabase functions deploy send-email
   ```

## Step 3: Verify Setup

### Test from Browser Console

1. Open your app in the browser
2. Open Developer Console (F12)
3. Run this test:

```javascript
const { data, error } = await window.supabaseClient.functions.invoke('send-email', {
  body: {
    to: 'your-email@example.com', // Use your real email
    subject: 'Test Email from Cr8Kit',
    html: '<h1>Hello!</h1><p>If you receive this, the Edge Function is working!</p>',
    type: 'test'
  }
});

if (error) {
  console.error('Error:', error);
} else {
  console.log('Success! Check your email:', data);
}
```

### Check Logs

1. Go to Supabase Dashboard → Edge Functions → `send-email`
2. Click on **Logs** tab
3. You should see logs of the function execution

## Step 4: Update Email Domain (Optional but Recommended)

By default, emails are sent from `noreply@cr8kit.com`. To use your own domain:

1. **In Resend Dashboard:**
   - Go to **Domains**
   - Click **Add Domain**
   - Follow the DNS setup instructions
   - Verify your domain

2. **Update Edge Function:**
   - Edit `supabase/functions/send-email/index.ts`
   - Change the `fromEmail` values to use your domain
   - Redeploy the function

## Step 5: Test Booking Approval Email

1. Go to your app → "My Listings" → "Requests"
2. Approve a booking request
3. Fill in pickup details
4. Click "Approve & Send"
5. Check the renter's email inbox
6. Check browser console for any errors

## Troubleshooting

### "Function not found" error
- ✅ Make sure the function is deployed
- ✅ Check the function name is exactly `send-email`
- ✅ Verify you're using the correct Supabase project

### "Invalid API key" error
- ✅ Check the secret is set: Go to Edge Functions → Secrets
- ✅ Verify the key starts with `re_`
- ✅ Make sure there are no extra spaces in the key

### Email not received
- ✅ Check spam folder
- ✅ Verify email address is correct
- ✅ Check Resend dashboard → Emails for delivery status
- ✅ Check Edge Function logs for errors

### CORS errors
- ✅ The function includes CORS headers, should work automatically
- ✅ If issues persist, check browser console for specific error

## What Happens Now?

Once set up, emails will automatically be sent when:
- ✅ Owner approves a booking request
- ✅ Booking status changes (future features)
- ✅ Equipment is returned (future features)

The email includes:
- ✅ Complete receipt with breakdown
- ✅ Pickup location and time
- ✅ Booking number
- ✅ Total amount
- ✅ Professional HTML formatting

## Next Steps

1. ✅ Set up Resend account
2. ✅ Deploy Edge Function
3. ✅ Add API key as secret
4. ✅ Test with a real booking
5. ✅ Monitor email delivery

## Support

- **Resend Docs**: https://resend.com/docs
- **Supabase Edge Functions**: https://supabase.com/docs/guides/functions
- **Check Logs**: Supabase Dashboard → Edge Functions → Logs

---

**Your Edge Function is ready!** 🚀

The code in `js/my-listings.js` is already set up to call this function automatically.

