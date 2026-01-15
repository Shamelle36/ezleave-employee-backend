import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);

// File filter for images only
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};


export const removeSignatureBackground = async (req, res) => {
  // Set timeout for the entire request
  res.setTimeout(30000, () => {
    if (!res.headersSent) {
      res.status(408).json({
        success: false,
        message: "Request timeout - processing took too long"
      });
    }
  });

  try {
    const { image } = req.body;

    if (!image) {
      return res.status(400).json({
        success: false,
        message: "Image data is required"
      });
    }

    console.log("🖼️ Processing signature background removal...");

    // Validate and limit image size
    const maxSize = 5 * 1024 * 1024; // 5MB max
    const base64Size = Buffer.byteLength(image, 'utf8');
    
    if (base64Size > maxSize) {
      console.warn(`Image too large: ${base64Size} bytes`);
      return res.status(413).json({
        success: false,
        processedImage: image,
        message: "Image too large for processing (max 5MB)",
        warning: "Image exceeds 5MB limit"
      });
    }

    // Extract base64 data
    const base64Match = image.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!base64Match) {
      console.warn("Invalid base64 image format");
      return res.status(400).json({
        success: false,
        processedImage: image,
        message: "Invalid image format",
        warning: "Not a valid base64 image"
      });
    }

    const [, imageType, base64Data] = base64Match;
    const allowedTypes = ['png', 'jpeg', 'jpg', 'gif', 'webp'];
    
    if (!allowedTypes.includes(imageType.toLowerCase())) {
      console.warn(`Unsupported image type: ${imageType}`);
      return res.status(400).json({
        success: false,
        processedImage: image,
        message: "Unsupported image type",
        warning: `Image type ${imageType} not supported`
      });
    }

    const buffer = Buffer.from(base64Data, 'base64');
    
    // Enhanced signature processing algorithm
    try {
      // Get image metadata to determine optimal processing
      const metadata = await sharp(buffer).metadata();
      
      console.log(`Processing image: ${metadata.width}x${metadata.height}, format: ${metadata.format}`);
      
      // Create a grayscale version for threshold analysis
      const grayscaleBuffer = await sharp(buffer)
        .grayscale()
        .raw()
        .toBuffer();
      
      // Calculate average brightness
      let sum = 0;
      for (let i = 0; i < grayscaleBuffer.length; i++) {
        sum += grayscaleBuffer[i];
      }
      const avgBrightness = sum / grayscaleBuffer.length;
      
      // Dynamic threshold based on image characteristics
      let threshold = 200; // Default
      if (avgBrightness > 180) {
        // Very bright image (likely white background)
        threshold = 240;
      } else if (avgBrightness < 80) {
        // Dark image
        threshold = 150;
      } else {
        // Medium brightness
        threshold = Math.min(230, Math.max(180, avgBrightness + 30));
      }
      
      console.log(`Image stats - Avg brightness: ${avgBrightness.toFixed(2)}, Threshold: ${threshold}`);

      // Main processing pipeline for signatures
      const processedBuffer = await sharp(buffer)
        .resize(800, 300, {
          fit: 'inside',
          withoutEnlargement: true,
          background: { r: 255, g: 255, b: 255, alpha: 0 }
        })
        .normalise({ // Enhance contrast
          lower: 5,
          upper: 95
        })
        .grayscale() // Convert to grayscale
        .linear(1.2, -(threshold * 0.15)) // Enhance contrast further
        .threshold(threshold, {
          grayscale: true
        })
        .trim({ // Auto-crop transparent edges
          threshold: 10
        })
        .extend({ // Add padding
          top: 20,
          bottom: 20,
          left: 20,
          right: 20,
          background: { r: 255, g: 255, b: 255, alpha: 0 }
        })
        .png({
          compressionLevel: 9,
          adaptiveFiltering: true,
          palette: true, // Use palette for smaller file size
          colors: 2 // Black and transparent only for signatures
        })
        .toBuffer();

      const processedBase64 = processedBuffer.toString('base64');
      const processedImage = `data:image/png;base64,${processedBase64}`;

      console.log("✅ Background removed successfully");
      
      return res.json({
        success: true,
        processedImage: processedImage,
        message: "Signature background removed successfully",
        stats: {
          originalSize: base64Size,
          processedSize: processedBuffer.length,
          compressionRatio: ((base64Size - processedBuffer.length) / base64Size * 100).toFixed(1) + '%',
          thresholdUsed: threshold
        }
      });

    } catch (sharpError) {
      console.error("Sharp processing error:", sharpError);
      
      // Fallback 1: Simpler processing
      try {
        console.log("Trying simpler processing...");
        const simpleBuffer = await sharp(buffer)
          .resize(800, 300, { 
            fit: 'inside',
            withoutEnlargement: true 
          })
          .grayscale()
          .threshold(200, { grayscale: true })
          .png()
          .toBuffer();
          
        const simpleBase64 = simpleBuffer.toString('base64');
        const simpleImage = `data:image/png;base64,${simpleBase64}`;
        
        return res.json({
          success: true,
          processedImage: simpleImage,
          message: "Basic processing applied",
          warning: "Advanced processing failed, using basic method"
        });
      } catch (fallbackError) {
        console.error("Fallback processing also failed:", fallbackError);
        
        // Fallback 2: Just convert to PNG with transparency
        try {
          console.log("Trying PNG conversion only...");
          const pngBuffer = await sharp(buffer)
            .png()
            .toBuffer();
            
          const pngBase64 = pngBuffer.toString('base64');
          const pngImage = `data:image/png;base64,${pngBase64}`;
          
          return res.json({
            success: true,
            processedImage: pngImage,
            message: "Converted to PNG format",
            warning: "Could not remove background"
          });
        } catch (pngError) {
          console.error("PNG conversion failed:", pngError);
          throw new Error("All image processing attempts failed");
        }
      }
    }

  } catch (err) {
    console.error("❌ Error in removeSignatureBackground:", err);
    
    // Return error with original image for frontend fallback
    return res.status(500).json({
      success: false,
      message: "Failed to process signature image",
      error: err.message || "Unknown error",
      originalImage: req.body.image // Return original for frontend fallback
    });
  }
};

/**
 * Alternative endpoint for file upload processing
 * (If frontend prefers to send file instead of base64)
 */
export const processSignatureFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded"
      });
    }

    console.log(`📁 Processing uploaded file: ${req.file.filename}`);
    
    const filePath = req.file.path;
    
    try {
      // Process the signature with background removal
      const processedBuffer = await sharp(filePath)
        .resize(800, 300, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .normalise()
        .grayscale()
        .threshold(220, { grayscale: true })
        .trim()
        .png({
          compressionLevel: 9,
          adaptiveFiltering: true
        })
        .toBuffer();

      // Convert to base64 for response
      const processedBase64 = processedBuffer.toString('base64');
      const processedImage = `data:image/png;base64,${processedBase64}`;

      // Clean up temp file
      fs.unlinkSync(filePath);

      console.log("✅ File processed successfully");

      return res.json({
        success: true,
        processedImage: processedImage,
        message: "Signature processed successfully"
      });

    } catch (processError) {
      console.error("File processing error:", processError);
      
      // Clean up temp file
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      
      // Return original file as base64 as fallback
      const originalBuffer = fs.readFileSync(filePath);
      const originalBase64 = originalBuffer.toString('base64');
      const originalImage = `data:image/png;base64,${originalBase64}`;
      
      return res.json({
        success: true,
        processedImage: originalImage,
        message: "File processing failed, returning original",
        warning: processError.message
      });
    }

  } catch (error) {
    console.error("Process signature file error:", error);
    
    // Clean up temp file if exists
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    return res.status(500).json({
      success: false,
      message: "Failed to process signature file",
      error: error.message
    });
  }
};

/**
 * Health check endpoint
 */
export const healthCheck = (req, res) => {
  res.json({
    success: true,
    message: "Signature processing service is running",
    timestamp: new Date().toISOString(),
    version: "1.0.0"
  });
};