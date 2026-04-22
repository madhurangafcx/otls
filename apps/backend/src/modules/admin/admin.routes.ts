import { Hono } from 'hono';
import { authMiddleware, requireRole } from '../../middleware/auth';
import { adminService } from './admin.service';

export const adminRoutes = new Hono();

// ── GET /api/admin/stats — dashboard counters
adminRoutes.get('/stats', authMiddleware, requireRole('admin'), async (c) => {
  try {
    const stats = await adminService.getStats();
    return c.json({ data: stats });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return c.json({ error: { code: 'INTERNAL_ERROR', message: msg } }, 500);
  }
});
