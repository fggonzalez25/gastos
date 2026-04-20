import { VercelRequest, VercelResponse } from '@vercel/node';
import { google } from 'googleapis';

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `${process.env.APP_URL}/auth/callback`
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { code } = req.query;

  try {
    const { tokens } = await oauth2Client.getToken(code as string);

    res.setHeader('Set-Cookie', [
      `google_tokens=${JSON.stringify(tokens)}; HttpOnly; Secure; SameSite=None; Max-Age=${30 * 24 * 60 * 60}; Path=/`
    ]);

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
}
