import express from 'express';
import { sql  } from '../config/db.js';

const router = express.Router();

// Save or update push token
router.post('/save-push-token', async (req, res) => {
  try {
    const { user_id, expo_push_token } = req.body;
    
    console.log('📱 Saving push token for user:', user_id);
    
    if (!user_id || !expo_push_token) {
      return res.status(400).json({ 
        success: false, 
        message: 'User ID and push token are required' 
      });
    }
    
    // Check if token already exists for this user
    const [existingToken] = await sql`
      SELECT * FROM employee_push_tokens 
      WHERE user_id = ${user_id}
    `;
    
    let result;
    
    if (existingToken) {
      // Update existing token if different
      if (existingToken.expo_push_token !== expo_push_token) {
        [result] = await sql`
          UPDATE employee_push_tokens 
          SET expo_push_token = ${expo_push_token}, 
              created_at = NOW()
          WHERE user_id = ${user_id}
          RETURNING *
        `;
        console.log('🔄 Updated existing push token');
      } else {
        result = existingToken;
        console.log('ℹ️ Token unchanged, using existing');
      }
    } else {
      // Insert new token
      [result] = await sql`
        INSERT INTO employee_push_tokens (user_id, expo_push_token)
        VALUES (${user_id}, ${expo_push_token})
        RETURNING *
      `;
      console.log('✅ Created new push token');
    }
    
    return res.json({ 
      success: true, 
      message: existingToken ? 'Push token updated' : 'Push token saved',
      data: result 
    });
  } catch (error) {
    console.error('❌ Error saving push token:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to save push token',
      error: error.message 
    });
  }
});

// Get push token for a user
router.get('/:user_id', async (req, res) => {
  try {
    const { user_id } = req.params;
    
    const [token] = await sql`
      SELECT * FROM employee_push_tokens 
      WHERE user_id = ${user_id}
    `;
    
    if (!token) {
      return res.status(404).json({ 
        success: false, 
        message: 'No push token found for this user' 
      });
    }
    
    res.json({ 
      success: true, 
      data: token 
    });
  } catch (error) {
    console.error('❌ Error fetching push token:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch push token',
      error: error.message 
    });
  }
});

export default router;