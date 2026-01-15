import express from 'express';
import { 
  removeSignatureBackground, 
  processSignatureFile, 
  healthCheck
} from '../controllers/signatureController.js';

const router = express.Router();

// Health check
router.get('/health', healthCheck);

// Remove background from base64 image (main endpoint)
router.post('/remove-background', removeSignatureBackground);

// Alternative: Process uploaded file directly
router.post('/process-file', processSignatureFile);

export default router;