# Fix: "pickup_location column not found" Error

## Problem
When clicking "Approve & Send", you get this error:
```
Could not find the 'pickup_location' column of 'bookings' in the schema cache
```

## Solution
The `pickup_location` and `pickup_time` columns need to be added to your `bookings` table.

## Quick Fix (2 minutes)

### Step 1: Open Supabase SQL Editor
1. Go to https://supabase.com/dashboard
2. Select your project: `ibvzepzwoytvhrnllywi`
3. Click **SQL Editor** in the left sidebar
4. Click **New query**

### Step 2: Run the Migration
1. Copy the SQL from `database/migrations/add_pickup_fields_supabase.sql`
2. Paste it into the SQL Editor
3. Click **Run** (or press Cmd/Ctrl + Enter)

### Step 3: Verify
You should see a success message and a table showing the new columns:
- `pickup_location`
- `pickup_time`
- `return_status`
- `cancellation_reason`

## What This Does

Adds these columns to the `bookings` table:
- ✅ `pickup_location` - Where the equipment will be picked up
- ✅ `pickup_time` - When the equipment will be picked up
- ✅ `return_status` - Tracks if equipment has been returned
- ✅ `cancellation_reason` - Reason for cancellation (if any)

## After Running

1. ✅ Try approving a booking again
2. ✅ The error should be gone
3. ✅ Pickup details will be saved correctly
4. ✅ Email will be sent with pickup information

## Alternative: Run via Supabase CLI

If you have Supabase CLI installed:

```bash
cd /Users/adedze/Desktop/Cr8kit
supabase db execute -f database/migrations/add_pickup_fields_supabase.sql
```

## Troubleshooting

**Error: "column already exists"**
- ✅ That's fine! The `IF NOT EXISTS` clause prevents errors
- ✅ Just means the columns were already added

**Error: "permission denied"**
- ✅ Make sure you're logged into the correct Supabase project
- ✅ Verify you have admin access to the database

**Still getting the error after running**
- ✅ Refresh your browser page
- ✅ Clear browser cache
- ✅ Wait a few seconds for schema cache to update

---

**That's it!** Once you run the SQL, the approval feature will work perfectly. 🎉

