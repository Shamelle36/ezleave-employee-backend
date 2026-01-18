import { sql } from "../config/db.js";

export const getNotifications = async (req, res) => {
  const { userId } = req.params;

  console.log("📩 API called for userId:", userId);

  try {
    // Get employee's full name first
    const [employee] = await sql`
      SELECT CONCAT(first_name, ' ', last_name) as full_name
      FROM employee_list
      WHERE user_id = ${userId}
      LIMIT 1;
    `;

    const employeeFullName = employee?.full_name || '';
    
    // Get notifications excluding those where employee filed the leave
    const notifications = await sql`
      SELECT 
        id,
        user_id,
        message,
        read,
        created_at,
        TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI') as formatted_time
      FROM notifications 
      WHERE user_id = ${userId}
      AND NOT (
        message LIKE ${employeeFullName + ' filed a %leave on%'}
        OR message LIKE ${employeeFullName + ' filed an %leave on%'}
      )
      ORDER BY created_at DESC
    `;

    console.log(`✅ Found ${notifications.length} filtered notifications for user ${userId}`);

    // Get unread count for filtered notifications
    const [unreadCount] = await sql`
      SELECT COUNT(*) as count
      FROM notifications
      WHERE user_id = ${userId}
      AND read = false
      AND NOT (
        message LIKE ${employeeFullName + ' filed a %leave on%'}
        OR message LIKE ${employeeFullName + ' filed an %leave on%'}
      )
    `;

    res.json({
      success: true,
      notifications: notifications,
      unread_count: parseInt(unreadCount?.count || 0),
      total: notifications.length
    });
  } catch (error) {
    console.error("❌ Error fetching notifications:", error);
    res.status(500).json({ 
      success: false,
      message: "Server error", 
      error: error.message 
    });
  }
};

// ✅ Create new notification (FIXED VERSION)
export const createNotification = async (req, res) => {
  const { user_id, message, type = 'general', leave_id, approver_name } = req.body;

  if (!user_id || !message) {
    return res.status(400).json({ 
      success: false,
      message: "user_id and message are required" 
    });
  }

  try {
    // Optional: You can store additional data as JSON in the message
    let fullMessage = message;
    if (leave_id) {
      fullMessage += ` (Leave ID: ${leave_id})`;
    }
    if (approver_name) {
      fullMessage += ` - Approved by: ${approver_name}`;
    }

    const result = await sql`
      INSERT INTO notifications (user_id, message) 
      VALUES (${user_id}, ${fullMessage}) 
      RETURNING *
    `;

    console.log("✅ Created notification ID:", result[0].id);
    
    // FIXED: Properly send push notification with await and error handling
    let pushResult = null;
    let pushError = null;
    
    try {
      const [tokenRow] = await sql`
        SELECT expo_push_token
        FROM employee_push_tokens
        WHERE user_id = ${user_id}
        LIMIT 1;
      `;

      if (tokenRow?.expo_push_token) {
        console.log(`📤 Sending push to token: ${tokenRow.expo_push_token.substring(0, 30)}...`);
        
        // FIX: AWAIT the fetch and get the response
        const pushResponse = await fetch("https://exp.host/--/api/v2/push/send", {
          method: "POST",
          headers: { 
            "Accept": "application/json",
            "Accept-encoding": "gzip, deflate",
            "Content-Type": "application/json" 
          },
          body: JSON.stringify([{  // FIX: Wrap in array as per Expo docs
            to: tokenRow.expo_push_token,
            sound: "default",
            title: type === 'leave_approval' ? "Leave Approved 🎉" : 
                   type === 'leave_rejection' ? "Leave Rejected ❌" : "Notification",
            body: message,
            data: { 
              type: type,
              leave_id: leave_id || null,
              approver_name: approver_name || null,
              notification_id: result[0].id
            },
          }]),
        });

        pushResult = await pushResponse.json();
        console.log("📤 Expo API Response:", JSON.stringify(pushResult, null, 2));
        
        if (pushResponse.status !== 200 || pushResult.errors) {
          pushError = pushResult.errors?.[0]?.message || "Expo API error";
          console.warn("⚠️ Expo returned error:", pushError);
        } else {
          console.log("✅ Push notification sent successfully");
        }
      } else {
        console.log(`⚠️ No push token found for user ${user_id}`);
      }
    } catch (pushError) {
      console.error("❌ Push notification failed:", pushError.message);
      // Don't fail the main request if push fails
    }

    res.status(201).json({
      success: true,
      notification: result[0],
      push_notification: {
        sent: !!pushResult,
        result: pushResult,
        error: pushError
      }
    });
  } catch (error) {
    console.error("❌ Error creating notification:", error);
    res.status(500).json({ 
      success: false,
      message: "Server error",
      error: error.message 
    });
  }
};

// ✅ Mark notification as read (IMPROVED)
export const markAsRead = async (req, res) => {
  const { id } = req.params;
  const { user_id } = req.body; // Added user_id for security

  try {
    // If user_id is provided, ensure the notification belongs to this user
    let query;
    let params;
    
    if (user_id) {
      query = sql`
        UPDATE notifications 
        SET read = true 
        WHERE id = ${id} AND user_id = ${user_id}
        RETURNING *
      `;
    } else {
      query = sql`
        UPDATE notifications 
        SET read = true 
        WHERE id = ${id}
        RETURNING *
      `;
    }

    const result = await query;
    
    if (result.length === 0) {
      return res.status(404).json({ 
        success: false,
        message: user_id ? "Notification not found or unauthorized" : "Notification not found" 
      });
    }
    
    res.json({
      success: true,
      notification: result[0]
    });
  } catch (error) {
    console.error("❌ Error marking notification as read:", error);
    res.status(500).json({ 
      success: false,
      message: "Server error",
      error: error.message 
    });
  }
};

// ✅ Mark all notifications as read (NEW)
export const markAllAsRead = async (req, res) => {
  const { user_id } = req.body;

  if (!user_id) {
    return res.status(400).json({ 
      success: false,
      message: "user_id is required" 
    });
  }

  try {
    const result = await sql`
      UPDATE notifications 
      SET read = true 
      WHERE user_id = ${user_id} AND read = false
      RETURNING COUNT(*) as updated_count;
    `;
    
    const updatedCount = parseInt(result[0]?.updated_count || 0);
    
    res.json({ 
      success: true,
      message: `Marked ${updatedCount} notifications as read`,
      updated_count: updatedCount 
    });
  } catch (error) {
    console.error("❌ Error marking all notifications as read:", error);
    res.status(500).json({ 
      success: false,
      message: "Server error",
      error: error.message 
    });
  }
};

// ✅ Get unread notification count (NEW)
export const getUnreadCount = async (req, res) => {
  const { userId } = req.params;

  try {
    const [result] = await sql`
      SELECT COUNT(*) as unread_count
      FROM notifications
      WHERE user_id = ${userId} AND read = false;
    `;
    
    res.json({ 
      success: true,
      unread_count: parseInt(result?.unread_count || 0)
    });
  } catch (error) {
    console.error("❌ Error fetching notification count:", error);
    res.status(500).json({ 
      success: false,
      message: "Server error",
      error: error.message 
    });
  }
};

// ✅ Delete notification (NEW)
export const deleteNotification = async (req, res) => {
  const { id } = req.params;
  const { user_id } = req.body;

  if (!user_id) {
    return res.status(400).json({ 
      success: false,
      message: "user_id is required" 
    });
  }

  try {
    const result = await sql`
      DELETE FROM notifications 
      WHERE id = ${id} AND user_id = ${user_id}
      RETURNING *;
    `;
    
    if (result.length === 0) {
      return res.status(404).json({ 
        success: false,
        message: "Notification not found or unauthorized" 
      });
    }
    
    res.json({ 
      success: true,
      message: "Notification deleted",
      notification: result[0]
    });
  } catch (error) {
    console.error("❌ Error deleting notification:", error);
    res.status(500).json({ 
      success: false,
      message: "Server error",
      error: error.message 
    });
  }
};

// ✅ Test push notification directly
export const testPushDirect = async (req, res) => {
  const { user_id, token } = req.body;
  
  try {
    let expoToken = token;
    
    // If user_id is provided, get token from DB
    if (user_id && !token) {
      const [tokenRow] = await sql`
        SELECT expo_push_token
        FROM employee_push_tokens
        WHERE user_id = ${user_id}
        LIMIT 1;
      `;
      
      if (!tokenRow?.expo_push_token) {
        return res.status(400).json({
          success: false,
          message: "No push token found for user"
        });
      }
      
      expoToken = tokenRow.expo_push_token;
    }
    
    console.log(`🔍 Testing push to: ${expoToken.substring(0, 30)}...`);
    
    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { 
        "Accept": "application/json",
        "Content-Type": "application/json" 
      },
      body: JSON.stringify([{
        to: expoToken,
        sound: "default",
        title: "Test Notification 🧪",
        body: "This is a direct test from the server",
        data: { test: true, timestamp: new Date().toISOString() }
      }]),
    });
    
    const result = await response.json();
    console.log("📤 Expo Response:", result);
    
    res.json({
      success: response.status === 200,
      message: "Push test completed",
      expo_response: result,
      token_used: expoToken.substring(0, 10) + "...",
      token_length: expoToken.length
    });
    
  } catch (error) {
    console.error("❌ Push test error:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

