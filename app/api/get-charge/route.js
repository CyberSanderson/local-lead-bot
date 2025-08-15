import Stripe from 'stripe';

// The secret key is safely loaded from your server's environment variables
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST(request) {
  try {
    const { chargeId } = await request.json();

    if (!chargeId) {
      return new Response(JSON.stringify({ error: 'Charge ID is required' }), { status: 400 });
    }

    // Your server securely communicates with Stripe
    const charge = await stripe.charges.retrieve(chargeId);

    // Send back only the safe, necessary data to the front-end
    return new Response(JSON.stringify({
      status: charge.status,
      amount: charge.amount,
      receipt_url: charge.receipt_url
    }), { status: 200 });

  } catch (error) {
    console.error("Stripe API error:", error);
    return new Response(JSON.stringify({ error: 'Failed to retrieve charge details' }), { status: 500 });
  }
}