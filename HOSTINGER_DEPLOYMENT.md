# Deploying to Hostinger Cloud Startup (Node.js)

To deploy this application to your Hostinger Cloud Startup hosting plan, follow these steps:

## Prerequisites
1. Ensure your Hostinger plan supports Node.js (often managed via hPanel's "Node.js app" section or standard VPS/Cloud Server access).
2. Download your complete source code (you can download it as a ZIP and extract it to your server's `public_html` or app directory, or use Git to clone it).

## Step-by-Step Deployment (hPanel Node.js Application)

1. **Access your hPanel:**
   Navigate to the **Websites** section and manage your domain. Go to the **Advanced -> Node.js** section (if available) or connect via **SSH**.

2. **Upload your code:**
   Upload your extracted project directory to a folder on your server (e.g., `domains/yourdomain.com/app/`).

3. **Configure Environment Variables:**
   Create a `.env` file in the root of your application folder with your production secrets (exactly like the `.env` you used locally).
   ```env
   GEMINI_API_KEY=your_gemini_api_key
   PINTEREST_USE_SANDBOX=false
   VITE_PINTEREST_APP_ID=your_pinterest_app_id
   VITE_PINTEREST_APP_SECRET=your_pinterest_secret
   VITE_GOOGLE_CLIENT_ID=your_google_client_id
   RECIPEPRESS_APP_TOKEN=your_secure_auth_token
   ```

4. **Install Dependencies:**
   Connect via SSH to your directory or use the hPanel Terminal, and run:
   ```bash
   npm install
   ```

5. **Build the Application Front-End & Back-End:**
   Since this is a Full-Stack application (Vite + Express in TypeScript), you must compile both. Run:
   ```bash
   npm run build
   ```
   **Note:** This creates the compiled `dist/` directory that contains both the React front-end payload and the `server.cjs` backend.

6. **Start the Application:**
   * **Using Hostinger's Node.js Manager (Passenger):**
     Point the "Application Startup File" to `app.js` (which we've created to automatically boot your compiled server).
   * **Using PM2 via SSH:**
     ```bash
     npx pm2 start npm --name "recipepress" -- run start
     npx pm2 save
     ```
   * **Directly via NPM:**
     ```bash
     npm run start
     ```

7. **Ensure the Port matches:**
   Our server is configured to bind to port `3000` (which is standard for PM2 / cloud apps). Hostinger typically proxies internet requests from port `80/443` to whichever internal port your Node app is running on. If they require a specific variable (like `process.env.PORT`), our app will default to `3000`.

## Updating the application in the future
1. Upload your new files.
2. Run `npm install` (if dependencies changed).
3. Run `npm run build`.
4. Restart your node process (e.g., `npx pm2 restart recipepress` OR hit "Restart" in hPanel).
