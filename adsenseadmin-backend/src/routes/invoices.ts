import { Router, Request, Response } from 'express';
import { Invoice } from '../models/Invoice';
import { AdminUser } from '../models/AdminUser';

const router = Router();

// GET /api/invoices?userId=...&isSuperAdmin=true
// Super admin: returns all invoices with creator populated
// Regular admin: returns only their own invoices
router.get('/', async (req: Request, res: Response) => {
  try {
    const { userId, isSuperAdmin } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    // Verify the user exists
    const user = await AdminUser.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    let invoices;
    if (isSuperAdmin === 'true' && user.isSuperAdmin) {
      // Super admin sees all invoices
      invoices = await Invoice.find()
        .populate('createdBy', 'username')
        .sort({ createdAt: -1 });
    } else {
      // Regular admin sees only their own invoices
      invoices = await Invoice.find({ createdBy: userId })
        .populate('createdBy', 'username')
        .sort({ createdAt: -1 });
    }

    res.json({ status: true, data: invoices });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/invoices — Create a new invoice
router.post('/', async (req: Request, res: Response) => {
  try {
    const { title, amount, notes, createdBy } = req.body;

    if (!title || amount === undefined || !createdBy) {
      return res.status(400).json({ error: 'title, amount, and createdBy are required' });
    }

    // Verify the creator exists and is not a super admin
    const user = await AdminUser.findById(createdBy);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const invoice = await Invoice.create({
      createdBy,
      title,
      amount: Number(amount),
      notes: notes || '',
    });

    const populated = await Invoice.findById(invoice._id).populate('createdBy', 'username');
    res.status(201).json({ status: true, data: populated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/invoices/:id/approve — Super admin approves an invoice
router.patch('/:id/approve', async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;

    // Verify the approver is a super admin
    const admin = await AdminUser.findById(userId);
    if (!admin || !admin.isSuperAdmin) {
      return res.status(403).json({ error: 'Only super admins can approve invoices' });
    }

    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    if (invoice.status !== 'Pending') {
      return res.status(400).json({ error: 'Only pending invoices can be approved' });
    }

    invoice.status = 'Approved';
    await invoice.save();

    const populated = await Invoice.findById(invoice._id).populate('createdBy', 'username');
    res.json({ status: true, data: populated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/invoices/:id/reject — Super admin rejects an invoice
router.patch('/:id/reject', async (req: Request, res: Response) => {
  try {
    const { userId, rejectionReason } = req.body;

    // Verify the rejector is a super admin
    const admin = await AdminUser.findById(userId);
    if (!admin || !admin.isSuperAdmin) {
      return res.status(403).json({ error: 'Only super admins can reject invoices' });
    }

    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    if (invoice.status !== 'Pending') {
      return res.status(400).json({ error: 'Only pending invoices can be rejected' });
    }

    invoice.status = 'Rejected';
    invoice.rejectionReason = rejectionReason || '';
    await invoice.save();

    const populated = await Invoice.findById(invoice._id).populate('createdBy', 'username');
    res.json({ status: true, data: populated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/invoices/:id — Admin deletes their own pending invoice
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;

    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    // Only the creator can delete, and only if pending
    if (invoice.createdBy.toString() !== userId) {
      return res.status(403).json({ error: 'You can only delete your own invoices' });
    }

    if (invoice.status !== 'Pending') {
      return res.status(400).json({ error: 'Only pending invoices can be deleted' });
    }

    await Invoice.findByIdAndDelete(req.params.id);
    res.json({ status: true, message: 'Invoice deleted' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
