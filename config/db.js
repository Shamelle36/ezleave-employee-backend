import { neon } from '@neondatabase/serverless';

import "dotenv/config";

export const sql = neon(process.env.DATABASE_URL);

export async function initDB() {
    try {
        await sql `CREATE TABLE IF NOT EXISTS employee_list (
            id SERIAL PRIMARY KEY,
            user_id VARCHAR(255) NOT NULL,                 
            id_number VARCHAR(50) UNIQUE NOT NULL, 
            name VARCHAR(255) NOT NULL,
            gender VARCHAR(20),                    
            civil_status VARCHAR(50),              
            position VARCHAR(255),
            department VARCHAR(255),
            email VARCHAR(255) UNIQUE NOT NULL,
            phone_number VARCHAR(15),
            address TEXT,
            date_hired DATE,
            employment_status VARCHAR(50) DEFAULT 'Active',
            profile_picture TEXT,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )`;

    } catch (error) {
        console.error('Error initializing database:', error);
        process.exit(1);
    }
}

export async function initDBDepartment() {
    try {
        await sql `CREATE TABLE IF NOT EXISTS department (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) UNIQUE NOT NULL,
            description TEXT,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )`;

    } catch (error) {
        console.error('Error initializing department table:', error);
        process.exit(1);
    }
}

export async function initDBLeaveApplication() {
    try {
        await sql `CREATE TABLE IF NOT EXISTS leave_applications (
            id SERIAL PRIMARY KEY,
            user_id INT NOT NULL REFERENCES employee_list(id) ON DELETE CASCADE,

            office_department VARCHAR(255),
            position VARCHAR(255),
            salary NUMERIC(12,2),
            date_filing DATE NOT NULL,

            leave_type VARCHAR(100) NOT NULL,   
            details TEXT,                       
            inclusive_dates DATERANGE NOT NULL, 
            number_of_days INT,

            commutation_requested BOOLEAN DEFAULT FALSE,

            vacation_earned NUMERIC(5,2) DEFAULT 0,
            vacation_balance NUMERIC(5,2) DEFAULT 0,
            sick_earned NUMERIC(5,2) DEFAULT 0,
            sick_balance NUMERIC(5,2) DEFAULT 0,

            recommendation VARCHAR(50),         
            recommendation_reason TEXT,         
            approved_days_with_pay INT,
            approved_days_without_pay INT,
            approved_other TEXT,

            status VARCHAR(50) DEFAULT 'Pending',
            approved_by INT REFERENCES employee_list(id), 

            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        );
        `

    } catch (error) {
        console.error('Error initializing leave application table:', error);
        process.exit(1);
    }
}


export async function initDBLeaveEntitlement() {
    try {
        const result = await sql `
            CREATE TABLE IF NOT EXISTS leave_entitlements (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL,           
            leave_type TEXT NOT NULL,               
            year INTEGER NOT NULL,
            total_days INTEGER NOT NULL,            
            used_days INTEGER DEFAULT 0,
            balance_days INTEGER GENERATED ALWAYS AS (total_days - used_days) STORED,
            created_at TIMESTAMP DEFAULT now(),
            updated_at TIMESTAMP DEFAULT now(),
            CONSTRAINT unique_leave_per_user UNIQUE (user_id, leave_type, year),
            CONSTRAINT fk_leave_entitlements_employee FOREIGN KEY (user_id)
                REFERENCES employee_list(id)
                ON DELETE CASCADE
            );
        `
        console.log('Leave Entitlements Table Initialized:', result);

    } catch (error) {
        console.error('Error initializing leave entitlement table:', error);
        process.exit(1);
    }
}


