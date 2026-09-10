import { Router } from 'express';
import multer from 'multer';
import { TransactionController } from '../controllers/transactionController';
import { requireAuth } from '../middleware/authMiddleware';

export const transactionRouter = Router();

// Configure Multer for memory storage with file size limit of 25MB
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type: Only CSV files (.csv) are supported'));
    }
  },
});

// All transaction routes are protected
transactionRouter.use(requireAuth);

// Ingestion endpoints
transactionRouter.post('/upload', upload.single('file'), TransactionController.uploadCsv);
transactionRouter.post('/demo-seed', TransactionController.seedDemoData);
transactionRouter.get('/batches', TransactionController.getBatches);
transactionRouter.get('/batches/:batchId', TransactionController.getBatchDetails);

// Transaction explorer queries
transactionRouter.get('/stats', TransactionController.getTransactionStats);
transactionRouter.get('/', TransactionController.getTransactions);
transactionRouter.get('/:id', TransactionController.getTransactionById);
