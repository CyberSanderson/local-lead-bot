import { supabase } from '@/lib/supabaseClient';
import { appendToSheet } from '@/lib/google-sheets-api'; // Use our new, more powerful G-Sheets library
import nodemailer from 'nodemailer';
import { z } from "zod";

// Define the schema for incoming lead data
const leadSchema = z.object({
  name: z.string().min(2).max(50).trim(),
  phone: z.string().min(10).max(15), // Loosened for international numbers
  service: z.string().min(2),
  time: z.string().datetime({ offset: true }),
  userId: z.string().uuid(), // Expecting a UUID from Supabase
});

export async function POST(request) {
  try {
    const body = await request.json();
    
    // 1. Validate the incoming data, including the userId
    const parsed = leadSchema.safeParse(body);
    if (!parsed.success) {
      console.error("Validation failed:", parsed.error);
      return new Response(JSON.stringify({ error: "Invalid input" }), { status: 400 });
    }
    const { userId, name, phone, service, time } = parsed.data;

    // 2. Look up the user's config from your Supabase database
    const { data: userConfig, error: dbError } = await supabase
      .from('users')
      .select('notification_email, google_sheet_id')
      .eq('id', userId)
      .single();

    if (dbError || !userConfig) {
      console.error("Supabase Error:", dbError);
      return new Response(JSON.stringify({ error: "Invalid user configuration" }), { status: 404 });
    }
    const { notification_email, google_sheet_id } = userConfig;

    // 3. Convert time to a readable format
    const readableTime = new Date(time).toLocaleString("en-US", { timeZone: "America/New_York", weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "numeric", minute: "2-digit", hour12: true });

    // 4. Save the lead to the user's specific Google Sheet
    if (google_sheet_id) {
      try {
        await appendToSheet(google_sheet_id, [name, phone, service, readableTime]);
      } catch (sheetErr) {
        console.error("Google Sheets append error:", sheetErr);
        // Don't stop the process, just log the error
      }
    }
    
    // 5. Send the lead email to the user's specific notification email
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
      from: `"Local Lead Bot" <no-reply@localleadbot.com>`,
      to: notification_email, // DYNAMICALLY use the plumber's email
      subject: "New Lead from Your Website!",
      text: `
You have a new lead!

Name: ${name}
Phone: ${phone}
Service needed: ${service}
Preferred time: ${readableTime}
      `,
    };

    await transporter.sendMail(mailOptions);

    return new Response(JSON.stringify({ message: "Lead processed successfully" }), { status: 200 });

  } catch (error) {
    console.error("Internal server error:", error);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), { status: 500 });
  }
}






