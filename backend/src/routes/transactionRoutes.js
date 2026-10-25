import { Router } from 'express';
import {
    listTransactions,
    getTransaction,
    createTransaction,
    updateTransaction,
    deleteTransaction,
    deleteAllTransactions,
    importTransactions,
    loadDemoTransactions,
    exportTransactions
} from '../controllers/transactionController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = Router();

// Every transaction route needs a logged-in user.
router.use(requireAuth);

router.get('/', listTransactions);
router.post('/', createTransaction);
router.delete('/', deleteAllTransactions);

// These fixed paths must come before "/:id" so they aren't read as IDs.
router.get('/export', exportTransactions);
router.post('/import', importTransactions);
router.post('/demo', loadDemoTransactions);

router.get('/:id', getTransaction);
router.put('/:id', updateTransaction);
router.delete('/:id', deleteTransaction);

export default router;
