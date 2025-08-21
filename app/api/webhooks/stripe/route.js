// In /api/webhook/stripe.js (or wherever you have it)
import nodemailer from 'nodemailer';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(request) {
  const sig = request.headers.get('stripe-signature');
  const body = await request.text();

  let event;

  // 1. Verify the webhook signature
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    console.error(`❌ Webhook signature verification failed:`, err.message);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  // 2. Handle the 'checkout.session.completed' event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const customerEmail = session.customer_details.email;
    const customerName = session.customer_details.name;
    
    // IMPORTANT: Get the User ID we passed from the signup page
    const userId = session.client_reference_id;

    // Exit if the User ID is missing, which would be an error.
    if (!userId) {
        console.error('🚨 Critical Error: User ID (client_reference_id) was not found in the Stripe session.');
        return new Response(JSON.stringify({ error: 'Webhook handler failed: Missing User ID.' }), { status: 500 });
    }

    console.log(`✅ Payment successful for user: ${userId} (${customerEmail})`);

    try {
      // 3. Generate the personalized JavaScript snippet using the existing user's ID
      const userSnippet = `
<script>
  window.localLeadBotConfig = {
    userId: "${userId}"
  };
</script>
<script src="https://www.localleadbot.pro/chatbot.js" async defer></script>
      `;

      // 4. Send the "Welcome" email with the snippet
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: 587,
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      const mailOptions = {
        from: `"Local Lead Bot" <sanderson@localleadbot.pro>`,
        to: customerEmail,
        subject: "Welcome to Local Lead Bot! Your Chatbot is Ready.",
        html: `
          <h1>Welcome, ${customerName || 'there'}!</h1>
          <p>Thank you for signing up for Local Lead Bot. Your personalized AI chatbot is ready to be installed on your website.</p>
          <p>To get started, simply copy the code snippet below and paste it onto your website right before the closing <code>&lt;/body&gt;</code> tag.</p>
          <pre><code>${userSnippet.trim().replace(/</g, "&lt;").replace(/>/g, "&gt;")}</code></pre>
          <p>That's it! The chatbot will appear on your site and start capturing leads for you immediately.</p>
          <p>If you have any questions, just reply to this email.</p>
          <p>Best,</p>
          <p>The Local Lead Bot Team</p>
        `,
      };

      console.log(`Sending welcome email to ${customerEmail}...`);
      await transporter.sendMail(mailOptions);
      console.log(`✅ Welcome email sent.`);

    } catch (error) {
      console.error('🚨 Onboarding process failed:', error);
      return new Response(JSON.stringify({ error: 'Webhook handler failed.' }), { status: 500 });
    }
  }

  // Return a 200 response to acknowledge receipt of the event
  return new Response(JSON.stringify({ received: true }), { status: 200 });
}