# Stripe Payment Intent - Supabase Edge Function Example

To make Stripe payments work, you need to create a backend endpoint. Here's an example using Supabase Edge Functions.

## Setup Instructions

1. **Install Supabase CLI** (if not already installed):
   ```bash
   npm install -g supabase
   ```

2. **Initialize Supabase Functions** (in your project root):
   ```bash
   supabase functions new create-payment-intent
   ```

3. **Create the Edge Function** at `supabase/functions/create-payment-intent/index.ts`:

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Stripe from "https://esm.sh/stripe@14.0.0?target=deno"

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2023-10-16",
  httpClient: Stripe.createFetchHttpClient(),
})

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const { amount, accountId } = await req.json()

    // Validate input
    if (!amount || amount <= 0) {
      return new Response(
        JSON.stringify({ error: "Invalid amount" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // Create PaymentIntent with Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: "usd",
      metadata: {
        account_id: accountId,
      },
    })

    return new Response(
      JSON.stringify({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})
```

4. **Set your Stripe Secret Key** in Supabase:
   - Go to your Supabase project dashboard
   - Navigate to Project Settings > Edge Functions > Secrets
   - Add secret: `STRIPE_SECRET_KEY` with your Stripe secret key (starts with `sk_test_` for test mode)

5. **Deploy the function**:
   ```bash
   supabase functions deploy create-payment-intent
   ```

6. **Update `stripe-integration.js`** to call your endpoint:

```javascript
async createPaymentIntent(amount, accountId) {
    const supabaseUrl = configManager.getSupabaseConfig()?.url;
    if (!supabaseUrl) {
        throw new Error('Supabase URL not configured');
    }

    const { data: { session } } = await getSupabaseClient().auth.getSession();
    if (!session) {
        throw new Error('Not authenticated');
    }

    const response = await fetch(
        `${supabaseUrl}/functions/v1/create-payment-intent`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`,
                'apikey': configManager.getSupabaseConfig()?.anonKey
            },
            body: JSON.stringify({
                amount: amount,
                accountId: accountId
            })
        }
    );

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create payment intent');
    }

    return await response.json();
}
```

## Alternative: Use a Serverless Function

If you prefer not to use Supabase Edge Functions, you can use:
- **Vercel Serverless Functions**
- **Netlify Functions**
- **AWS Lambda**
- **Your own Node.js/Express backend**

The key requirement is that the endpoint:
1. Uses your Stripe **secret key** (never expose this in frontend code)
2. Creates a PaymentIntent using the Stripe API
3. Returns the `client_secret` to the frontend

## Testing

Once set up, test cards will work properly:
- ✅ Success: `4242 4242 4242 4242`
- ❌ Decline: `4000 0000 0000 0002`
- And all other test cards from the reference modal

