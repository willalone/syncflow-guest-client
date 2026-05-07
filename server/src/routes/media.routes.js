import express from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = express.Router();

/** Защита от open proxy: только CDN Unsplash (как в статическом меню). */
const ALLOWED_HOSTS = new Set(['images.unsplash.com', 'plus.unsplash.com']);

const MAX_IMAGE_BYTES = 6 * 1024 * 1024;

/**
 * GET /api/media/proxy?u=<encoded https URL>
 * Клиент (телефон) качает картинку с вашего LAN-сервера; сервер ходит на Unsplash.
 * Нужно, когда прямой доступ к images.unsplash.com с мобильной сети недоступен.
 */
router.get(
  '/proxy',
  asyncHandler(async (req, res) => {
    const raw = req.query.u;
    if (!raw || typeof raw !== 'string') {
      res.status(400).end();
      return;
    }

    let target;
    try {
      target = new URL(raw);
    } catch {
      res.status(400).end();
      return;
    }

    if (target.protocol !== 'https:') {
      res.status(400).end();
      return;
    }
    if (!ALLOWED_HOSTS.has(target.hostname)) {
      res.status(403).end();
      return;
    }

    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 20000);
    let upstream;
    try {
      upstream = await fetch(target.toString(), {
        signal: controller.signal,
        headers: {
          Accept: 'image/*,*/*;q=0.8',
          'User-Agent': 'SyncFlowEmployee/1.0 (image proxy)',
        },
      });
    } catch {
      res.status(502).end();
      return;
    } finally {
      clearTimeout(t);
    }

    if (!upstream.ok) {
      res.status(502).end();
      return;
    }

    const declaredLen = upstream.headers.get('content-length');
    if (declaredLen && Number(declaredLen) > MAX_IMAGE_BYTES) {
      res.status(502).end();
      return;
    }

    const ct = upstream.headers.get('content-type') || 'image/jpeg';
    res.setHeader('Content-Type', ct);
    res.setHeader('Cache-Control', 'public, max-age=604800, stale-while-revalidate=86400');

    if (!upstream.body) {
      const buf = Buffer.from(await upstream.arrayBuffer());
      if (buf.length > MAX_IMAGE_BYTES) {
        res.status(502).end();
        return;
      }
      res.send(buf);
      return;
    }

    let received = 0;
    const reader = upstream.body.getReader();
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        if (!value) continue;
        received += value.byteLength;
        if (received > MAX_IMAGE_BYTES) {
          await reader.cancel();
          if (!res.writableEnded) res.destroy();
          return;
        }
        res.write(Buffer.from(value));
      }
      res.end();
    } catch {
      if (!res.writableEnded) res.destroy();
    }
  })
);

export default router;
