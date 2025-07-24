import nodemailer from "nodemailer";
import { appendToSheet } from "@/lib/sheets"; // ✅ Make sure this path is correct

export async function POST(request) {
  try {
    const data = await request.json();
    const { name, phone, service, time } = data;

    if (!name || !phone || !service || !time) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400 }
      );
    }

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


    // ✅ Email the lead
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

    return new Response(
      JSON.stringify({ message: "Lead saved and email sent" }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error sending email or saving lead:", error);
    return new Response(
      JSON.stringify({ error: "Internal Server Error" }),
      { status: 500 }
    );
  }
}



