// Public Configuration File
// This file contains public configuration that can be safely committed to the repository
// Supabase URL and anon key are safe to expose publicly (they're designed for client-side use)

// IMPORTANT: Only include Supabase URL and anon key here - these are safe to expose
// DO NOT include secret keys (like Stripe secret key or Supabase service role key)

window.COFFEE_CLUB_CONFIG = window.COFFEE_CLUB_CONFIG || {};

// Set your Supabase URL and anon key here
// These values are safe to expose publicly and are required for the app to work
window.COFFEE_CLUB_CONFIG.supabase = {
    // Replace these with your actual Supabase project URL and anon key
    // You can find these in your Supabase project settings under API
    url: 'https://crtcxdsaqjzskbraobjv.supabase.co',  // Your Supabase project URL
    anonKey: 'sb_publishable_r3GUlCNCgWRRFJZ4N5zOBw_G6K90fBW'  // Your Supabase anon/public key
};

// Set your shop_id here (UUID of your coffee shop from the coffee_shop table)
// This identifies which coffee shop this frontend deployment belongs to
// Get this value from the Dev tab after creating a coffee shop
window.COFFEE_CLUB_CONFIG.shop_id = null;  // Replace with your shop_id UUID

// Stripe publishable key can also be included here (it's safe to expose)
// Or it can be loaded from the database after Supabase is initialized
// window.COFFEE_CLUB_CONFIG.stripe = {
//     publishableKey: 'YOUR_STRIPE_PUBLISHABLE_KEY_HERE'
// };

