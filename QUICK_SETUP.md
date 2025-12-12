# 🚀 Quick Setup - Email Function (5 Minutes)

## What You Need
- ✅ Resend account (free: https://resend.com)
- ✅ Supabase project access

## Steps

### 1. Get Resend API Key (2 min)
1. Sign up at https://resend.com
2. Go to **API Keys** → **Create API Key**
3. Copy the key (starts with `re_`)

### 2. Deploy Function in Supabase (3 min)

**Option A: Via Dashboard (Easiest)**
1. Go to https://supabase.com/dashboard
2. Select project: `ibvzepzwoytvhrnllywi`
3. **Edge Functions** → **Create function**
4. Name: `send-email`
5. Copy code from: `supabase/functions/send-email/index.ts`
6. Paste and click **Deploy**
7. Go to **Secrets** tab
8. Add secret: `RESEND_API_KEY` = your Resend key
9. **Done!** ✅

**Option B: Via CLI**
```bash
supabase login
supabase link --project-ref ibvzepzwoytvhrnllywi
supabase secrets set RESEND_API_KEY=re_your_key_here
supabase functions deploy send-email
```

### 3. Test It
```javascript
// In browser console:
await window.supabaseClient.functions.invoke('send-email', {
  body: {
    to: 'your-email@example.com',
    subject: 'Test',
    html: '<h1>It works!</h1>'
  }
});
```

## That's It! 🎉

Now when you approve bookings, emails will be sent automatically with:
- ✅ Receipt information
- ✅ Pickup details
- ✅ Booking number
- ✅ Total amount

See `EDGE_FUNCTION_SETUP.md` for detailed instructions.

