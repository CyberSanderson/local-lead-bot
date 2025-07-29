import { z } from "zod";
import nodemailer from "nodemailer";
import { appendToSheet } from "@/lib/sheets";

// 🛡️ Define the schema
const leadSchema = z.object({
  name: z.string().min(2).max(50).trim(),
  phone: z.string().regex(/^\d{10}$/, "Phone must be a valid 10-digit U.S. phone number"),
  service: z.enum([
  'plumbing',
  'drain cleaning',
  'emergency repair',
  'water heater installation',
  'water heater repair',
  'leak detection',
  'pipe repair',
  'toilet repair',
  'toilet installation',
  'faucet installation',
  'faucet repair',
  'sewer line repair',
  'sewer line replacement',
  'sump pump installation',
  'sump pump repair',
  'gas line repair',
  'clogged sink',
  'garbage disposal repair',
  'shower installation',
  'shower repair',
  'other'
])
,
  time: z.string().datetime({ offset: true }) // ISO 8601 datetime
});

export async function POST(request) {
  try {
    const body = await request.json();

    // ✅ Validate and sanitize input
    const parsed = leadSchema.safeParse(body);

    if (!parsed.success) {
      const formattedErrors = parsed.error.issues.map((issue) => ({
        field: issue.path[0],
        message: issue.message,
      }));
      return new Response(JSON.stringify({ errors: formattedErrors }), { status: 400 });
    }

    const { name, phone, service, time } = parsed.data;

    // ✅ Save to Google Sheets
    try {
      console.log("Saving to Google Sheets...");
      await appendToSheet({ name, phone, service, time });
      console.log("Saved to Google Sheets ✅");
    } catch (sheetErr) {
      console.error("Google Sheets error ❌:", sheetErr);
      return new Response(
        JSON.stringify({ error: "Failed to save lead to Google Sheets" }),
        { status: 500 }
      );
    }

    // ✅ Send email
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
      to: "lifeinnovation78@gmail.com",
      cc: "localead@gmail.com",
      subject: "New Plumbing Lead",
      text: `
You have a new lead!

Name: ${name}
Phone: ${phone}
Service needed: ${service}
Preferred time: ${time}
      `,
    };

    await transporter.sendMail(mailOptions);

    return new Response(JSON.stringify({ message: "Lead saved and email sent" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Internal server error:", error);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
    });
  }
}




