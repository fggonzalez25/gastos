import express from 'express';
import { createServer as createViteServer } from 'vite';
import { google } from 'googleapis';
import path from 'path';
import 'dotenv/config';
import cookieParser from 'cookie-parser';

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(cookieParser());

// categories mapping to columns
const CATEGORIES = [
  'comida',
  'expensas',
  'transporte',
  'supermercado',
  'gastos tarjeta',
  'internet',
  'servicios',
  'Salidas',
  'sueldo',
  'mercadolibre'
];

const CATEGORY_TO_COL = CATEGORIES.reduce((acc, cat, index) => {
  acc[cat] = String.fromCharCode(67 + index); // C, D, E...
  return acc;
}, {} as Record<string, string>);

// Google OAuth Setup
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `${process.env.APP_URL}/auth/callback`
);

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

// API ROUTES
app.get('/api/auth/url', (req, res) => {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent'
  });
  res.json({ url: authUrl });
});

app.get('/auth/callback', async (req, res) => {
  const { code } = req.query;
  try {
    const { tokens } = await oauth2Client.getToken(code as string);
    // Secure cookie for iframe
    res.cookie('google_tokens', JSON.stringify(tokens), {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    });
    
    res.send(`
      <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS' }, '*');
              window.close();
            } else {
              window.location.href = '/';
            }
          </script>
          <p>Autenticación exitosa. Esta ventana se cerrará automáticamente.</p>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('Error in OAuth callback:', error);
    res.status(500).send('Authentication failed');
  }
});

app.get('/api/auth/status', (req, res) => {
  const tokens = req.cookies.google_tokens;
  res.json({ authenticated: !!tokens });
});

app.post('/api/logout', (req, res) => {
  res.clearCookie('google_tokens', {
    httpOnly: true,
    secure: true,
    sameSite: 'none'
  });
  res.json({ success: true });
});

// Sheet interactions
const getSheetsClient = (tokens: any) => {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  auth.setCredentials(tokens);
  return google.sheets({ version: 'v4', auth });
};

app.post('/api/add-expense', async (req, res) => {
  const tokensStr = req.cookies.google_tokens;
  if (!tokensStr) return res.status(401).json({ error: 'Not authenticated' });
  
  const tokens = JSON.parse(tokensStr);
  const { date, amount, detail, category, type } = req.body;
  const spreadsheetId = process.env.SPREADSHEET_ID;

  if (!spreadsheetId) {
    console.error('SPREADSHEET_ID is missing in environment variables');
    return res.status(500).json({ error: 'Spreadsheet ID not configured in Secrets' });
  }

  try {
    const sheets = getSheetsClient(tokens);
    const dateObj = new Date(date + 'T00:00:00');
    const monthYear = dateObj.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    const capitalizedMonth = monthYear.charAt(0).toUpperCase() + monthYear.slice(1);

    // 1. Check if sheet exists
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
    let sheet = spreadsheet.data.sheets?.find(s => s.properties?.title === capitalizedMonth);

    if (!sheet) {
      // Create new sheet with headers and totals
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [
            {
              addSheet: {
                properties: { title: capitalizedMonth }
              }
            }
          ]
        }
      });

      // Add headers
      const headers = ['Fecha', 'Detalle', ...CATEGORIES];
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${capitalizedMonth}!A1:L1`,
        valueInputOption: 'RAW',
        requestBody: { values: [headers] }
      });

      // Prepare totals area (e.g. at row 100 for now, or we can use append logic)
      // For this implementation, we will append data and managed a summary area at the top or bottom.
      // The user wants it at the bottom.
    }

    // 2. Append row
    const value = type === 'expense' ? -Math.abs(amount) : Math.abs(amount);
    const row = new Array(12).fill('');
    row[0] = date;
    row[1] = detail;
    const colIndex = CATEGORIES.indexOf(category);
    if (colIndex !== -1) {
      row[colIndex + 2] = value;
    }

    // Simply append to the end of the sheet
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
});

app.get('/api/summary', async (req, res) => {
  const tokensStr = req.cookies.google_tokens;
  if (!tokensStr) return res.status(401).json({ error: 'Not authenticated' });
  
  const tokens = JSON.parse(tokensStr);
  const spreadsheetId = process.env.SPREADSHEET_ID;

  if (!spreadsheetId) {
    console.error('SPREADSHEET_ID is missing in environment variables');
    return res.status(500).json({ error: 'Spreadsheet ID not configured in Secrets' });
  }

  try {
    const sheets = getSheetsClient(tokens);
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
    const sheetTitles = spreadsheet.data.sheets?.map(s => s.properties?.title) || [];
    
    // Get current month by default or all months
    // For simplicity, return all data from all sheets to construct a full overview
    const allData: any[] = [];
    
    const parseCurrency = (val: any) => {
      if (val === undefined || val === null || val === '') return 0;
      if (typeof val === 'number') return val;
      // Handle Spanish/Argentinian formatting: 1.250,50 -> 1250.50
      let str = val.toString().replace(/[$\s]/g, '').trim();
      if (str.includes(',') && str.includes('.')) {
        str = str.replace(/\./g, '').replace(',', '.');
      } else if (str.includes(',')) {
        str = str.replace(',', '.');
      }
      return parseFloat(str) || 0;
    };

    for (const title of sheetTitles) {
      if (title.toLowerCase().includes('resumen') || title.toLowerCase().includes('config')) continue;
      
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${title}!A2:L1000` // Skip header
      });
      const rows = response.data.values || [];
      // Filter out totals rows and empty rows
      const dataRows = rows.filter(r => r.length > 0 && r[0] && r[0] !== 'TOTALES' && r[0] !== 'TOTAL GENERAL' && !r[0].toString().includes('GASTOS'));
      
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
        category: CATEGORIES.find((_, i) => parseCurrency(r[i+2]) !== 0) || 'otros'
      })));
    }
    
    res.json(allData);
  } catch (error) {
    console.error('Error fetching summary:', error);
    res.status(500).json({ error: 'Failed to fetch summary' });
  }
});

// VITE MIDDLEWARE
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
