# Supabase Edge Function Deployment Guide

## Prerequisites

1. **Install Supabase CLI** (if not already installed):
   ```bash
   npm install -g supabase
   ```

2. **Login to Supabase**:
   ```bash
   npx supabase login
   ```

3. **Link your project** (if not already linked):
   ```bash
   npx supabase link --project-ref YOUR_PROJECT_REF
   ```
   You can find your project reference ID in your Supabase dashboard URL:
   `https://supabase.com/dashboard/project/YOUR_PROJECT_REF`

## Set Stripe Secret Key

Before deploying, you need to set your Stripe secret key as a secret in Supabase:

1. Go to your Supabase project dashboard
2. Navigate to **Project Settings** > **Edge Functions** > **Secrets**
3. Click **Add new secret**
4. Name: `STRIPE_SECRET_KEY`
5. Value: Your Stripe secret key (starts with `sk_test_` for test mode, `sk_live_` for production)
6. Click **Save**

**Important**: Never commit your Stripe secret key to git. Always use Supabase secrets.

## Deploy the Function

Deploy the `create-payment-intent` function:

```bash
npx supabase functions deploy create-payment-intent
```

Or use the npm script:

```bash
npm run supabase functions deploy create-payment-intent
```

## Verify Deployment

After deployment, you should see a success message. The function will be available at:
```
https://YOUR_PROJECT_REF.supabase.co/functions/v1/create-payment-intent
```

## Testing

Once deployed, test with:
- ✅ Success card: `4242 4242 4242 4242`
- ❌ Decline card: `4000 0000 0000 0002`

## Troubleshooting

### Function not found (404)
- Make sure you've deployed the function: `npx supabase functions deploy create-payment-intent`
- Check that your project is linked: `npx supabase link --project-ref YOUR_PROJECT_REF`

### Stripe error: "Invalid API Key"
- Make sure you've set the `STRIPE_SECRET_KEY` secret in Supabase dashboard
- Verify the key starts with `sk_test_` (test mode) or `sk_live_` (production)

### CORS errors
- The function includes CORS headers, but if you see CORS errors, check that your Supabase URL is correct

## Local Development (Optional)

To test locally before deploying:

1. **Start Supabase locally**:
   ```bash
   npx supabase start
   ```

2. **Set local secret**:
   ```bash
   npx supabase secrets set STRIPE_SECRET_KEY=sk_test_your_key_here
   ```

3. **Serve function locally**:
   ```bash
   npx supabase functions serve create-payment-intent
   ```

4. **Test locally**: The function will be available at `http://localhost:54321/functions/v1/create-payment-intent`

