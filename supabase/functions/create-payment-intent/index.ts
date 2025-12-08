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
    const { amount, accountId, currency, description, receiptEmail } = await req.json()

    // Validate input
    if (!amount || amount <= 0) {
      return new Response(
        JSON.stringify({ error: "Invalid amount" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    if (!accountId) {
      return new Response(
        JSON.stringify({ error: "Account ID is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // Create PaymentIntent with Stripe
    // Required fields: amount, currency
    // Recommended fields: description, receipt_email, statement_descriptor_suffix, metadata
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents (Stripe requires integer amounts)
      currency: currency || "usd", // Required: ISO currency code
      payment_method_types: ["card"], // Explicitly specify payment method types
      description: description || `Coffee Club account funding: $${amount.toFixed(2)}`,
      receipt_email: receiptEmail || undefined, // Email for receipt (optional but recommended)
      statement_descriptor_suffix: "SIDE PORCH", // Suffix for what appears on customer's credit card statement (max 22 chars, appended to merchant name)
      metadata: {
        account_id: accountId,
        funding_amount: amount.toString(),
        type: "account_funding"
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
    console.error("Payment Intent creation error:", error)
    return new Response(
      JSON.stringify({ error: error.message || "Failed to create payment intent" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})

