import { google } from 'googleapis';

// Use the same authentication you already have set up
const auth = new google.auth.JWT({
  email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
  key: process.env.GOOGLE_SHEETS_PRIVATE_KEY.replace(/\\n/g, '\n'),
  scopes: [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive', // Add Drive scope to manage permissions
  ],
});

const sheets = google.sheets({ version: 'v4', auth });
const drive = google.drive({ version: 'v3', auth });

/**
 * Creates a new Google Sheet for a user, adds headers, and transfers ownership.
 * @param {string} userEmail The email address of the new user.
 * @param {string} businessName The name of the user's business.
 * @returns {Promise<string>} The ID of the newly created spreadsheet.
 */
export async function createSheetForUser(userEmail, businessName) {
  try {
    // 1. Create the new spreadsheet
    console.log(`Creating sheet for ${businessName}...`);
    const resource = {
      properties: {
        title: `${businessName} - Local Lead Bot Leads`,
      },
    };
    const spreadsheet = await sheets.spreadsheets.create({ resource });
    const spreadsheetId = spreadsheet.data.spreadsheetId;
    console.log(`Sheet created with ID: ${spreadsheetId}`);

    // 2. Add the header row to the first sheet
    const headerValues = [['Name', 'Phone', 'Service', 'Time', 'Captured At']];
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Sheet1!A1',
      valueInputOption: 'RAW',
      requestBody: {
        values: headerValues,
      },
    });
    console.log('Header row added.');

    // 3. Transfer ownership of the sheet to the new user
    await drive.permissions.create({
      fileId: spreadsheetId,
      requestBody: {
        role: 'owner',
        type: 'user',
        emailAddress: userEmail,
      },
      transferOwnership: true,
    });
    console.log(`Ownership transferred to ${userEmail}.`);

    return spreadsheetId;
  } catch (error) {
    console.error('Error creating Google Sheet for user:', error);
    throw new Error('Failed to create and configure Google Sheet.');
  }
}

/**
 * Appends a new lead to a specific Google Sheet.
 * @param {string} spreadsheetId The ID of the sheet to append to.
 * @param {Array<string>} leadData The lead data to append (e.g., [name, phone, service, time]).
 */
export async function appendToSheet(spreadsheetId, leadData) {
    try {
        const capturedAt = new Date().toISOString();
        const values = [[...leadData, capturedAt]];

        await sheets.spreadsheets.values.append({
            spreadsheetId,
            range: 'Sheet1!A:E',
            valueInputOption: 'USER_ENTERED',
            requestBody: {
                values,
            },
        });
    } catch (error) {
        console.error(`Error appending to sheet ${spreadsheetId}:`, error);
        throw new Error('Failed to append lead to Google Sheet.');
    }
}