import { Router, Request, Response } from 'express';
import { AdminUser } from '../models/AdminUser';

const router = Router();

// Seed super admin on first run
async function seedSuperAdmin() {
  const exists = await AdminUser.findOne({ isSuperAdmin: true });
  if (!exists) {
    await AdminUser.create({
      username: process.env.ADMIN_EMAIL || 'admin@quizango.com',
      password: process.env.ADMIN_PASSWORD || 'Quizango@2026',
      isSuperAdmin: true,
      isActive: true,
    });
    console.log('🔑 Super admin seeded');
  }
}
seedSuperAdmin().catch(console.error);

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await AdminUser.findOne({ username: email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (!user.isActive) {
      return res.status(403).json({ error: 'Account is disabled' });
    }

    return res.json({
      status: true,
      role: user.isSuperAdmin ? 'superadmin' : 'admin',
      email: user.username,
      userId: user._id,
      isSuperAdmin: user.isSuperAdmin,
    });
  } catch (err: any) {
    console.error('Login error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
