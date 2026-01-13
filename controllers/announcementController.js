import { sql } from "../config/db.js";

// 📌 Get all announcements with admin info
export const getAnnouncements = async (req, res) => {
  try {
    console.log("📡 Fetching announcements...");
    
    const result = await sql`
      SELECT 
        a.id, 
        a.title, 
        a.details, 
        a.created_at, 
        a.updated_at,
        u.full_name AS posted_by, 
        u.role AS position, 
        u.profile_picture,
        a.images
      FROM announcements a
      LEFT JOIN useradmin u ON a.created_by = u.id
      ORDER BY a.created_at DESC
    `;

    console.log(`✅ Found ${result.length} announcements`);

    // Process the results
    const processedAnnouncements = result.map(announcement => {
      // Process images - handle all possible cases
      let imagesArray = [];
      
      if (announcement.images) {
        try {
          // Case 1: Already an array
          if (Array.isArray(announcement.images)) {
            imagesArray = announcement.images;
          }
          // Case 2: JSON string
          else if (typeof announcement.images === 'string') {
            const parsed = JSON.parse(announcement.images);
            imagesArray = Array.isArray(parsed) ? parsed : [parsed];
          }
          // Case 3: Single value
          else {
            imagesArray = [announcement.images];
          }
          
          // Flatten and clean images
          imagesArray = imagesArray.flat(2).filter(img => img && typeof img === 'string');
          
        } catch (e) {
          console.warn(`Failed to parse images for announcement ${announcement.id}:`, e.message);
          imagesArray = [];
        }
      }

      // Process profile picture
      let profilePicture = announcement.profile_picture;
      if (profilePicture && typeof profilePicture === 'string') {
        if (!profilePicture.startsWith('http') && !profilePicture.startsWith('/')) {
          profilePicture = `${process.env.API_URL || 'http://localhost:3000'}/uploads/${profilePicture}`;
        }
      } else {
        profilePicture = null;
      }

      return {
        id: announcement.id,
        title: announcement.title || '',
        details: announcement.details || '',
        created_at: announcement.created_at,
        updated_at: announcement.updated_at,
        posted_by: announcement.posted_by || 'Admin',
        position: announcement.position || '',
        profile_picture: profilePicture,
        images: imagesArray
      };
    });

    console.log(`✅ Successfully processed ${processedAnnouncements.length} announcements`);
    
    res.json(processedAnnouncements);

  } catch (err) {
    console.error("❌ Error fetching announcements:", err);
    res.status(500).json({ 
      error: "Failed to fetch announcements",
      details: err.message 
    });
  }
};