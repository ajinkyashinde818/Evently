# Railway Database Setup

## Steps to Connect Backend to Railway PostgreSQL

1. **Get your Railway Database Password:**
   - Go to your Railway project
   - Click on your PostgreSQL service
   - Find the connection string in the "Connect" tab
   - Copy the password from the connection string

2. **Update the .env file:**
   Replace `YOUR_PASSWORD` in the DATABASE_URL with your actual Railway password:
   ```
   DATABASE_URL=postgresql://postgres:ACTUAL_PASSWORD@mainline.proxy.rlwy.net:48167/railway
   ```

3. **Test the connection:**
   ```bash
   node test-db-connection.js
   ```

4. **Deploy to Railway:**
   - Set the DATABASE_URL environment variable in your Railway service
   - The backend will automatically use Railway's database when deployed

## Environment Variables for Railway

Add this in your Railway service environment variables:
```
DATABASE_URL=postgresql://postgres:ACTUAL_PASSWORD@mainline.proxy.rlwy.net:48167/railway
JWT_SECRET=evently_super_secret_key
EMAIL_USER=krushnarajebhosale18@gmail.com
EMAIL_PASS=fccn gavc ekvl mksd
```

## Database Schema

The backend will automatically create/update the database schema using the `ensureDatabaseSchema.js` utility when the server starts.
