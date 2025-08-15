// In /api/signup/start/route.js

import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

// IMPORTANT: For server-side actions like creating a user,
// you must use the Service Role Key for your Supabase client.
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST(request) {
  const body = await request.text();
  const params = new URLSearchParams(body);
  const email = params.get('email');
  const contact_name = params.get('contactName');
  const business_name = params.get('businessName');

  if (!email || !contact_name || !business_name) {
      return new Response(JSON.stringify({ error: "Missing required form fields." }), { status: 400 });
  }

  // STEP 1: Create the user in Supabase Auth. This saves the email.
  const { data: { user: newAuthUser }, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: email,
    email_confirm: true, // Automatically confirm the email
  });

  if (authError) {
    console.error("Supabase auth error:", authError);
    return new Response(JSON.stringify({ error: "Could not create user account." }), { status: 500 });
  }

  // The trigger you created will have automatically made a new row in 'profiles'.
  // STEP 2: Update that new profile row with the extra details.
  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .update({ 
      contact_name: contact_name, 
      business_name: business_name,
      notification_email: email
    })
    .eq('id', newAuthUser.id); // Find the profile where the ID matches the new user's ID

  if (profileError) {
    console.error("Supabase profile update error:", profileError);
    // You might want to delete the auth user here to clean up
    return new Response(JSON.stringify({ error: "Could not update user profile." }), { status: 500 });
  }

  // STEP 3: Create the Stripe Checkout Session
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price: 'price_1RrUI10NYMA63YPu7qDtyl71', 
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `https://www.localleadbot.pro/thank-you.html`,
      cancel_url: `https://www.localleadbot.pro/signup.html`,
      customer_email: email,
      client_reference_id: newAuthUser.id, 
    });

    return new Response(null, {
      status: 303,
      headers: { Location: session.url },
    });
  } catch (err) {
    console.error("Stripe session error:", err);
    return new Response(JSON.stringify({ error: "Could not create payment session." }), { status: 500 });
  }
}