import { supabase } from '@/lib/supabaseClient';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST(request) {
  // Vercel Edge functions do not support the formData method, so we parse the URL-encoded string
  const body = await request.text();
  const params = new URLSearchParams(body);
  const email = params.get('email');
  const contact_name = params.get('contactName');
  const business_name = params.get('businessName');

  if (!email || !contact_name || !business_name) {
      return new Response(JSON.stringify({ error: "Missing required form fields." }), { status: 400 });
  }

  // 1. Create a "pending" user in your Supabase database
  const { data: newUser, error } = await supabase
    .from('users')
    .insert([
      { 
        email: email, 
        contact_name: contact_name, 
        business_name: business_name,
        notification_email: email // Set this as the default
      },
    ])
    .select()
    .single();

  if (error) {
    console.error("Supabase insert error:", error);
    return new Response(JSON.stringify({ error: "Could not create user account." }), { status: 500 });
  }

  // 2. Create a Stripe Checkout Session linked to the new user's ID
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          // IMPORTANT: Replace with your actual Price ID from Stripe
          price: 'price_1RrUI10NYMA63YPu7qDtyl71', 
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `https://www.localleadbot.pro/thank-you.html`, // A page to show on success
      cancel_url: `https://www.localleadbot.pro/signup.html`, // Return to signup on cancellation
      customer_email: email,
      // **CRUCIAL**: This links the Stripe payment to the user in our database
      client_reference_id: newUser.id, 
    });

    // 3. Redirect the user to the Stripe payment page
    return new Response(null, {
      status: 303, // Use 303 See Other for POST -> GET redirects
      headers: {
        Location: session.url,
      },
    });
  } catch (err) {
    console.error("Stripe session error:", err);
    return new Response(JSON.stringify({ error: "Could not create payment session." }), { status: 500 });
  }
}