import { google } from 'googleapis';
import path from 'path';
import nodemailer from "nodemailer";
import { appendToSheet } from "@/lib/sheets";

export async function appendToSheet({ name, phone, service, time }) {
  const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON),
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});


  const authClient = await auth.getClient();
  const sheets = google.sheets({ version: 'v4', auth: authClient });

  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  const range = 'Leads!A:D';

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range,
    valueInputOption: 'RAW',
    requestBody: {
      values: [[name, phone, service, time]],
    },
  });
}

