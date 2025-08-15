// In /api/signup/start/route.js
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

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

  // STEP 1: Create the user in Supabase Auth
  const { data: { user: newAuthUser }, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: email,
    email_confirm: true,
  });

  if (authError) {
    console.error("Supabase auth error:", authError);
    return new Response(JSON.stringify({ error: "Could not create auth user." }), { status: 500 });
  }

  // STEP 2: Directly insert into the profiles table with the new ID
  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .insert({ 
      id: newAuthUser.id, // We are providing the ID directly now
      contact_name: contact_name, 
      business_name: business_name,
      notification_email: email
    });

  if (profileError) {
    console.error("Direct profile insert error:", profileError);
    return new Response(JSON.stringify({ error: "Could not insert into profile table." }), { status: 500 });
  }

  // If we get here, the database part worked. Now try creating the Stripe session.
  // ... (The Stripe part of your code remains the same) ...
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{ price: 'price_1RrUI10NYMA63YPu7qDtyl71', quantity: 1 }],
      mode: 'payment',
      success_url: `https://www.localleadbot.pro/thank-you.html`,
      cancel_url: `https://www.localleadbot.pro/signup.html`,
      customer_email: email,
      client_reference_id: newAuthUser.id, 
    });
    return new Response(null, { status: 303, headers: { Location: session.url } });
  } catch (err) {
    console.error("Stripe session error:", err);
    return new Response(JSON.stringify({ error: "Could not create payment session." }), { status: 500 });
  }
}