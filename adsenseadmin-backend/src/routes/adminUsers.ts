import { Router, Request, Response } from 'express';
import { AdminUser } from '../models/AdminUser';

const router = Router();

// GET /api/admin-users — List all
router.get('/', async (_req: Request, res: Response) => {
  try {
    const users = await AdminUser.find().select('-password').sort({ createdAt: -1 });
    res.json({ status: true, data: users });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin-users/:id — Get one
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const user = await AdminUser.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ status: true, data: user });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin-users — Create
router.post('/', async (req: Request, res: Response) => {
  try {
    const { username, password, adsenseAllowedDomains, adsenseDomainDeductions, isActive } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const existing = await AdminUser.findOne({ username });
    if (existing) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    const user = await AdminUser.create({
      username,
      password,
      isSuperAdmin: false,
      isActive: isActive !== false,
      adsenseAllowedDomains: adsenseAllowedDomains || [],
      adsenseDomainDeductions: adsenseDomainDeductions || {},
    });

    const result = user.toObject();
    delete (result as any).password;
    res.status(201).json({ status: true, data: result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/admin-users/:id — Update
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const user = await AdminUser.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const { username, password, adsenseAllowedDomains, adsenseDomainDeductions, isActive } = req.body;

    if (username) user.username = username;
    if (password) user.password = password; // pre-save hook will hash it
    if (adsenseAllowedDomains !== undefined) user.adsenseAllowedDomains = adsenseAllowedDomains;
    if (adsenseDomainDeductions !== undefined) user.adsenseDomainDeductions = adsenseDomainDeductions;
    if (isActive !== undefined) user.isActive = isActive;

    await user.save();

    const result = user.toObject();
    delete (result as any).password;
    res.json({ status: true, data: result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/admin-users/:id — Delete
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const user = await AdminUser.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.isSuperAdmin) return res.status(403).json({ error: 'Cannot delete super admin' });

    await AdminUser.findByIdAndDelete(req.params.id);
    res.json({ status: true, message: 'User deleted' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/admin-users/:id/toggle — Toggle active
router.patch('/:id/toggle', async (req: Request, res: Response) => {
  try {
    const user = await AdminUser.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.isSuperAdmin) return res.status(403).json({ error: 'Cannot disable super admin' });

    user.isActive = !user.isActive;
    await user.save();

    const result = user.toObject();
    delete (result as any).password;
    res.json({ status: true, data: result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
