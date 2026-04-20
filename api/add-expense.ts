import { VercelRequest, VercelResponse } from '@vercel/node';
import { google } from 'googleapis';

const CATEGORIES = [
  'comida', 'expensas', 'transporte', 'supermercado',
  'gastos tarjeta', 'internet', 'servicios', 'Salidas', 'sueldo', 'mercadolibre'
];

const getSheetsClient = (tokens: any) => {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  auth.setCredentials(tokens);
  return google.sheets({ version: 'v4', auth });
};

const parseCookies = (req: VercelRequest) => {
  const cookieHeader = req.headers.cookie || '';
  return Object.fromEntries(
    cookieHeader.split(';').map(c => {
      const [k, ...v] = c.trim().split('=');
      return [k, v.join('=')];
    })
  );
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const cookies = parseCookies(req);
  const tokensStr = cookies['google_tokens'];
  if (!tokensStr) return res.status(401).json({ error: 'Not authenticated' });

  const tokens = JSON.parse(decodeURIComponent(tokensStr));
  const { date, amount, detail, category, type } = req.body;
  const spreadsheetId = process.env.SPREADSHEET_ID;

  if (!spreadsheetId) return res.status(500).json({ error: 'Spreadsheet ID not configured' });

  try {
    const sheets = getSheetsClient(tokens);
    const dateObj = new Date(date + 'T00:00:00');
    const monthYear = dateObj.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    const capitalizedMonth = monthYear.charAt(0).toUpperCase() + monthYear.slice(1);

    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
    const sheet = spreadsheet.data.sheets?.find(s => s.properties?.title === capitalizedMonth);

    if (!sheet) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: { requests: [{ addSheet: { properties: { title: capitalizedMonth } } }] }
      });
      const headers = ['Fecha', 'Detalle', ...CATEGORIES];
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${capitalizedMonth}!A1:L1`,
        valueInputOption: 'RAW',
        requestBody: { values: [headers] }
      });
    }

    const value = type === 'expense' ? -Math.abs(amount) : Math.abs(amount);
    const row = new Array(12).fill('');
    row[0] = date;
    row[1] = detail;
    const colIndex = CATEGORIES.indexOf(category);
    if (colIndex !== -1) row[colIndex + 2] = value;

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${capitalizedMonth}!A1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [row] }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error adding expense:', error);
    res.status(500).json({ error: 'Failed to add expense' });
  }
}
