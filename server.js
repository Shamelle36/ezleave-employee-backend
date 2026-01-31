import dotenv from 'dotenv'; 
import express from 'express'; 
import rateLimiter from './middleware/rateLimiter.js'; 
import departmentRoute from './routes/departmentRoute.js'; 
import employeeRoute from './routes/employeeRoute.js'; 
import leaveEntitlementRoute from './routes/leaveEntitlementRoute.js'; 
import announcementRoute from './routes/announcementRoute.js';
import leaveTypeRoute from './routes/leaveTypeRoute.js'; 
import leaveApplicationRoute from './routes/leaveApplicationRoute.js';
import attendanceRoute from './routes/attendanceRoute.js';
import notificationRoutes from "./routes/notificationRoute.js";
import leaveCardRoutes from "./routes/leaveCardRoute.js";
import employeeTermsRoute from "./routes/employeeTermsRoute.js";
import pushTokensRouter from './routes/pushToken.js';
import loginCodeRoute from './routes/loginCodeRoute.js';
import { initDB, initDBDepartment, initDBLeaveApplication, initDBLeaveEntitlement, sql } from './config/db.js'; 
import job from './config/cron.js'; 
import { Webhook } from 'svix';
import bodyParser from 'body-parser';
import cors from 'cors';


    dotenv.config(); 

    
    const app = express();

    
    if(process.env.NODE_ENV === "production")job.start(); 
    
    app.use(cors());

   app.post(
      '/api/webhook',
      bodyParser.raw({ type: 'application/json' }),
      async (req, res) => {
        try {
          const payloadString = req.body.toString();
          const svixHeaders = req.headers;

          const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET_KEY);
          const evt = wh.verify(payloadString, svixHeaders);

          console.log("📩 Event type:", evt.type);
          console.log("➡️ Payload:", evt.data);

          if (evt.type === 'user.created') {
            const user = evt.data;
            const { id, first_name, last_name, email_addresses } = user;
            const email = email_addresses?.[0]?.email_address;

            if (!email) {
              console.warn('User created but no email found:', id);
              return res.status(400).json({ error: 'No email provided' });
            }

            // Step 1: Insert into users table
            await sql`
              INSERT INTO users (user_id, first_name, last_name, email)
              VALUES (${id}, ${first_name}, ${last_name}, ${email})
              ON CONFLICT (user_id) DO NOTHING
            `;

            // Step 2: Update employee_list with user_id (if email matches)
            const result = await sql`
              UPDATE employee_list
              SET user_id = ${id}, is_registered = true
              WHERE email = ${email}
              RETURNING *
            `;

            if (result.length > 0) {
              console.log(`✅ Linked user ${email} to employee_list`);
            } else {
              console.warn(`⚠️ No employee_list record found for ${email}, skipping`);
            }
          }

          res.status(200).json({ success: true, message: 'Webhook received' });
        } catch (err) {
          console.error('Webhook error:', err);
          res.status(400).json({ success: false, message: err.message });
        }
      }
    );


    app.use(rateLimiter); 
    app.use(express.json()); 
    const PORT = process.env.PORT || 5001; 
    
    app.get('/api/health', (req, res) => { 
        res.status(200).json({ status: 'OK', message: 'Server is healthy' }); 
    }); 
    
    app.use('/api/employee', employeeRoute); 
    app.use('/api/department', departmentRoute); 
    app.use('/api/leaveEntitlements', leaveEntitlementRoute); 
    app.use('/api/leaveTypes', leaveTypeRoute); 
    app.use('/api/announcements', announcementRoute);
    app.use('/api/leaveApplication', leaveApplicationRoute);
    app.use("/api/attendance", attendanceRoute);
    app.use("/api/notifications", notificationRoutes);
    app.use("/files", express.static("public/files"));
    app.use("/api/leaveCard", leaveCardRoutes);
    app.use("/api/employeeTerms", employeeTermsRoute);
    app.use('/api/push-tokens', pushTokensRouter);
    app.use('/api/login-codes', loginCodeRoute);

    app.get("/api/db-name", async (req, res) => {
      try {
        const [db] = await sql`SELECT current_database()`;
        res.json({ database: db.current_database });
      } catch (err) {
        console.error("Error fetching DB name:", err);
        res.status(500).json({ error: err.message });
      }
    });


    initDB().then(() => { 
        app.listen(PORT, () => { 
            console.log(`Server is running on port ${PORT}`); 
        }); 
    }) 
    
    initDBDepartment(); 
    initDBLeaveApplication(); 
    initDBLeaveEntitlement();