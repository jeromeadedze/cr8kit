# Email Notification Setup Guide

## Overview

This guide explains how to set up email notifications for booking requests and other events in Cr8Kit.

## Recommended Email Service Options

### Option 1: Supabase Edge Functions + Resend (Recommended)

**Best for**: Production-ready, reliable email delivery

**Setup Steps**:

1. Sign up for [Resend](https://resend.com) (free tier: 3,000 emails/month)
2. Get your API key from Resend dashboard
3. Create a Supabase Edge Function for sending emails
4. Set up database webhooks to trigger emails

**Pros**:

- Reliable delivery
- Good free tier
- Easy integration with Supabase
- Professional email templates

**Cons**:

- Requires Edge Functions setup
- Slightly more complex initial setup

### Option 2: Supabase Database Webhooks + Third-party Service

**Best for**: Quick setup with existing email service

**Setup Steps**:

1. Use services like:
   - [SendGrid](https://sendgrid.com) (100 emails/day free)
   - [Mailgun](https://www.mailgun.com) (5,000 emails/month free)
   - [AWS SES](https://aws.amazon.com/ses/) (62,000 emails/month free)
2. Set up Supabase Database Webhooks
3. Configure webhook to call your email service API

**Pros**:

- Works with existing email services
- Good free tiers available
- Flexible

**Cons**:

- Requires webhook configuration
- Need to manage API keys securely

### Option 3: Supabase Built-in Email (Limited)

**Best for**: Simple use cases, development

**Note**: Supabase has limited built-in email capabilities. For production, use Option 1 or 2.

## Implementation Example: Resend + Supabase Edge Function

### Step 1: Create Edge Function

Create `supabase/functions/send-email/index.ts`:

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

serve(async (req) => {
  try {
    const { to, subject, html, type } = await req.json();

    const { data, error } = await resend.emails.send({
      from: "Cr8Kit <noreply@yourdomain.com>",
      to: [to],
      subject: subject,
      html: html,
    });

    if (error) {
      return new Response(JSON.stringify({ error }), {
        headers: { "Content-Type": "application/json" },
        status: 400,
      });
    }

    return new Response(JSON.stringify({ data }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});
```

### Step 2: Set Environment Variable

In Supabase Dashboard:

- Go to Edge Functions
- Add `RESEND_API_KEY` as a secret

### Step 3: Create Database Webhook

In Supabase Dashboard:

1. Go to Database → Webhooks
2. Create new webhook:
   - **Table**: `bookings`
   - **Events**: `INSERT`, `UPDATE`
   - **Type**: HTTP Request
   - **URL**: `https://your-project.supabase.co/functions/v1/send-email`
   - **HTTP Method**: POST
   - **HTTP Headers**:
     ```
     Authorization: Bearer YOUR_SUPABASE_ANON_KEY
     Content-Type: application/json
     ```

### Step 4: Update JavaScript to Call Edge Function

Update `js/bookings.js`:

```javascript
// Send booking approval email
async function sendBookingApprovalEmail(booking, pickupLocation, pickupTime) {
  try {
    const { data: renter } = await window.supabaseClient
      .from("users")
      .select("email, full_name")
      .eq("user_id", booking.renter_id)
      .single();

    if (!renter) return;

    const emailHtml = `
      <h2>Booking Approved!</h2>
      <p>Your booking for <strong>${
        booking.equipment?.name || "equipment"
      }</strong> has been approved.</p>
      <h3>Pickup Details:</h3>
      <p><strong>Location:</strong> ${pickupLocation}</p>
      <p><strong>Time:</strong> ${pickupTime}</p>
      <p>Booking Number: ${booking.booking_number}</p>
    `;

    const { data, error } = await window.supabaseClient.functions.invoke(
      "send-email",
      {
        body: {
          to: renter.email,
          subject: `Booking Approved - ${
            booking.equipment?.name || "Equipment"
          }`,
          html: emailHtml,
          type: "booking_approved",
        },
      }
    );

    if (error) {
      console.error("Email error:", error);
      // Fallback to notification
      await createNotification(
        renter.user_id,
        "booking_approved",
        booking.booking_id
      );
    }
  } catch (error) {
    console.error("Error sending email:", error);
  }
}
```

## Email Templates

### Booking Request Email (to Owner)

```
Subject: New Booking Request - [Equipment Name]

Hi [Owner Name],

You have received a new booking request for [Equipment Name] from [Renter Name].

Booking Details:
- Dates: [Start Date] to [End Date]
- Total Days: [X] days
- Total Amount: GHS [Amount]
- Booking Number: [Booking Number]

Please log in to approve or reject this request.

[Approve Button] [Reject Button]

Best regards,
Cr8Kit Team
```

### Booking Approved Email (to Renter)

```
Subject: Booking Approved - [Equipment Name]

Hi [Renter Name],

Great news! Your booking request for [Equipment Name] has been approved.

Pickup Details:
- Location: [Pickup Location]
- Time: [Pickup Time]
- Date: [Start Date]

Booking Number: [Booking Number]
Total Amount: GHS [Amount]

Please make payment to confirm your booking.

[Pay Now Button]

Best regards,
Cr8Kit Team
```

### Equipment Returned Email (to Owner)

```
Subject: Equipment Returned - [Equipment Name]

Hi [Owner Name],

[Renter Name] has marked the equipment [Equipment Name] as returned.

Please confirm the return and check the equipment condition.

[Confirm Return Button]

Best regards,
Cr8Kit Team
```

## Quick Setup Checklist

- [ ] Choose email service (Resend recommended)
- [ ] Create account and get API key
- [ ] Set up Supabase Edge Function (if using Resend)
- [ ] Configure database webhooks
- [ ] Test email sending
- [ ] Update JavaScript functions to call email service
- [ ] Create email templates
- [ ] Test full workflow (booking → approval → email)

## Security Notes

1. **Never expose API keys in client-side code**
   - Store in Supabase Edge Function secrets
   - Use environment variables
2. **Validate email addresses**

   - Check format before sending
   - Handle bounces and invalid addresses

3. **Rate limiting**

   - Implement rate limiting to prevent abuse
   - Monitor email sending quotas

4. **Email verification**
   - Consider verifying user emails on signup
   - Use Supabase email confirmation feature

## Testing

Test email flow:

1. Create a booking request
2. Check owner receives email
3. Approve booking
4. Check renter receives pickup details
5. Mark equipment as returned
6. Check owner receives return notification

## Support

For issues:

- Check Supabase Edge Functions logs
- Check email service dashboard for delivery status
- Verify API keys are correct
- Check webhook configuration
