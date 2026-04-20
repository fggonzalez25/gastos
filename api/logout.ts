import { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Set-Cookie', [
    `google_tokens=; HttpOnly; Secure; SameSite=None; Max-Age=0; Path=/`
  ]);
  res.json({ success: true });
}
