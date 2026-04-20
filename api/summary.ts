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

const parseCurrency = (val: any) => {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') return val;
  let str = val.toString().replace(/[$\s]/g, '').trim();
  if (str.includes(',') && str.includes('.')) {
    str = str.replace(/\./g, '').replace(',', '.');
  } else if (str.includes(',')) {
    str = str.replace(',', '.');
  }
  return parseFloat(str) || 0;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const cookies = parseCookies(req);
  const tokensStr = cookies['google_tokens'];
  if (!tokensStr) return res.status(401).json({ error: 'Not authenticated' });

  const tokens = JSON.parse(decodeURIComponent(tokensStr));
  const spreadsheetId = process.env.SPREADSHEET_ID;
  if (!spreadsheetId) return res.status(500).json({ error: 'Spreadsheet ID not configured' });

  try {
    const sheets = getSheetsClient(tokens);
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
    const sheetTitles = spreadsheet.data.sheets?.map(s => s.properties?.title) || [];

    const allData: any[] = [];

    for (const title of sheetTitles) {
      if (title?.toLowerCase().includes('resumen') || title?.toLowerCase().includes('config')) continue;

      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${title}!A2:L1000`
      });

      const rows = response.data.values || [];
      const dataRows = rows.filter(r =>
        r.length > 0 && r[0] &&
        r[0] !== 'TOTALES' &&
        r[0] !== 'TOTAL GENERAL' &&
        !r[0].toString().includes('GASTOS')
      );

      allData.push(...dataRows.map(r => ({
        date: r[0],
        detail: r[1] || '',
        comida: parseCurrency(r[2]),
        expensas: parseCurrency(r[3]),
        transporte: parseCurrency(r[4]),
        supermercado: parseCurrency(r[5]),
        gastos_tarjeta: parseCurrency(r[6]),
        internet: parseCurrency(r[7]),
        servicios: parseCurrency(r[8]),
        salidas: parseCurrency(r[9]),
        sueldo: parseCurrency(r[10]),
        mercadolibre: parseCurrency(r[11]),
        category: CATEGORIES.find((_, i) => parseCurrency(r[i + 2]) !== 0) || 'otros'
      })));
    }

    res.json(allData);
  } catch (error) {
    console.error('Error fetching summary:', error);
    res.status(500).json({ error: 'Failed to fetch summary' });
  }
}
