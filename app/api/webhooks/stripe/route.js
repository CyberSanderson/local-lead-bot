import { createSheetForUser } from '@/lib/google-sheets-api';
import { supabase } from '@/lib/supabaseClient'; // We will create this file next
import nodemailer from 'nodemailer';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(request) {
  const sig = request.headers.get('stripe-signature');
  const body = await request.text();

  let event;

  // 1. Verify the webhook signature to ensure the request is from Stripe
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

    try {
      // 3. Create a new Google Sheet for the user
      // We'll use the customer's name for the sheet title for now
      console.log(`Creating Google Sheet for ${customerEmail}...`);
      const newSheetId = await createSheetForUser(customerEmail, `${customerName}'s Business`);
      console.log(`✅ Google Sheet created with ID: ${newSheetId}`);

      // 4. Create a new user record in our Supabase database
      console.log(`Creating user record in Supabase for ${customerEmail}...`);
      const { data: newUser, error: supabaseError } = await supabase
        .from('users')
        .insert([
          {
            email: customerEmail,
            contact_name: customerName,
            notification_email: customerEmail, // Default to their account email
            google_sheet_id: newSheetId,
          },
        ])
        .select()
        .single();

      if (supabaseError) {
        throw new Error(`Supabase error: ${supabaseError.message}`);
      }
      console.log(`✅ User record created with ID: ${newUser.id}`);

      // 5. Generate the personalized JavaScript snippet
      const userSnippet = `
<script>
  window.localLeadBotConfig = {
    userId: "${newUser.id}"
  };
</script>
<script src="https://www.localleadbot.pro/chatbot.js" async defer></script>
      `;

      // 6. Send the "Welcome" email with the snippet
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
          <h1>Welcome, ${customerName}!</h1>
          <p>Thank you for signing up for Local Lead Bot. Your personalized AI chatbot is ready to be installed on your website.</p>
          <p>To get started, simply copy the code snippet below and paste it onto your website right before the closing <code>&lt;/body&gt;</code> tag.</p>
          <pre><code>${userSnippet.trim()}</code></pre>
          <p>That's it! The chatbot will appear on your site and start capturing leads for you immediately.</p>
          <p>Your leads will be sent to this email address and will also be saved in your private Google Sheet, which has been shared with you.</p>
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
      // Here you would add logic to alert yourself that a manual setup is needed
      return new Response(JSON.stringify({ error: 'Webhook handler failed.' }), { status: 500 });
    }
  }

  // Return a 200 response to acknowledge receipt of the event
  return new Response(JSON.stringify({ received: true }), { status: 200 });
}