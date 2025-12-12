# Send Email Edge Function

This Supabase Edge Function sends emails using Resend API.

## Setup Instructions

### 1. Install Supabase CLI (if not already installed)

```bash
# macOS
brew install supabase/tap/supabase

# Or download from: https://github.com/supabase/cli/releases
```

### 2. Login to Supabase

```bash
supabase login
```

### 3. Link to Your Project

```bash
# Navigate to your project directory
cd /Users/adedze/Desktop/Cr8kit

# Link to your Supabase project
supabase link --project-ref ibvzepzwoytvhrnllywi
```

### 4. Get Resend API Key

1. Sign up at https://resend.com (free tier: 3,000 emails/month)
2. Go to API Keys in dashboard
3. Create a new API key
4. Copy the key (starts with `re_`)

### 5. Set Environment Variable in Supabase

**Option A: Via Supabase Dashboard (Easiest)**
1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to **Edge Functions** → **Secrets**
4. Click **Add Secret**
5. Name: `RESEND_API_KEY`
6. Value: Your Resend API key
7. Click **Save**

**Option B: Via Supabase CLI**
```bash
supabase secrets set RESEND_API_KEY=re_your_api_key_here
```

### 6. Deploy the Edge Function

```bash
# From the project root directory
supabase functions deploy send-email
```

### 7. Test the Function

You can test it from your browser console:

```javascript
const { data, error } = await window.supabaseClient.functions.invoke('send-email', {
  body: {
    to: 'your-email@example.com',
    subject: 'Test Email',
    html: '<h1>Hello from Cr8Kit!</h1><p>This is a test email.</p>',
    type: 'test'
  }
});

console.log('Result:', data, error);
```

## Function Parameters

The function accepts a JSON body with:

- `to` (required): Recipient email address
- `subject` (required): Email subject line
- `html` (required): HTML content of the email
- `type` (optional): Email type (e.g., 'booking_approved', 'booking_request')

## Response

**Success (200):**
```json
{
  "success": true,
  "data": { "id": "email-id" },
  "message": "Email sent successfully"
}
```

**Error (400/500):**
```json
{
  "error": "Error message"
}
```

## Troubleshooting

### Function not found
- Make sure you've deployed the function: `supabase functions deploy send-email`
- Check that you're using the correct project

### API key error
- Verify the secret is set: `supabase secrets list`
- Make sure the key starts with `re_`
- Check Resend dashboard to ensure the key is active

### Email not sending
- Check Edge Function logs in Supabase Dashboard
- Verify email address is valid
- Check Resend dashboard for delivery status

## Next Steps

Once deployed, the email function will be automatically called from:
- `js/my-listings.js` - Booking approval emails
- `js/bookings.js` - Booking notification emails
- Future email features

No code changes needed - it's already integrated! 🎉

