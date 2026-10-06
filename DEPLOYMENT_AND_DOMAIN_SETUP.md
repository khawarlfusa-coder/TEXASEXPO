# Deployment & Custom Domain Setup Guide
*Prepared for: Texas Expo Tech Solutions LLC*

When your domain is ready (e.g., `texasexpotech.com`), you can deploy this shopping portal in just a couple of minutes using any of the methods below.

---

## Method 1: Instant Static Deployment via Vercel or Netlify (Fastest & Free)

Because the storefront is built with pure, self-contained HTML/CSS/JS with full client-side catalog and checkout fallback, it can be deployed directly with zero server configuration.

### Deploying via Vercel:
1. Go to [vercel.com](https://vercel.com) and log in.
2. Click **Add New Project** &rarr; **Upload** (or push to GitHub).
3. Choose the `texas-expo-tech` folder or just the `public` folder.
4. Click **Deploy**. Your site will be live immediately on a temporary URL (e.g. `texas-expo-tech.vercel.app`).
5. **Attach Your Custom Domain:**
   - In Vercel, go to **Settings &rarr; Domains**.
   - Enter your domain (e.g. `texasexpotech.com` and `www.texasexpotech.com`).
   - Add the DNS records shown by Vercel into your Domain Registrar (Namecheap, GoDaddy, Cloudflare, etc.):
     - **A Record:** `@` points to `76.76.21.21`
     - **CNAME Record:** `www` points to `cname.vercel-dns.com`
   - SSL certificates are automatically generated for free!

---

## Method 2: Node.js Cloud Hosting (Render / Railway / VPS)

If you wish to use the full Node.js Express backend with server-side JSON persistence for orders:

### Deploying via Render.com:
1. Push this project folder to a GitHub repository.
2. In [render.com](https://render.com), click **New + &rarr; Web Service**.
3. Connect your GitHub repo.
4. Set:
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
5. Click **Create Web Service**.
6. **Custom Domain:** Go to **Settings &rarr; Custom Domains** &rarr; Add your domain and update your DNS records.

---

## Method 3: Standard cPanel / Shared Hosting / Apache

1. Open your cPanel **File Manager**.
2. Navigate to `public_html`.
3. Upload all contents from the `public/` directory (`index.html`, `admin.html`, `css/`, `js/`).
4. Ensure your domain points to your cPanel hosting IP address via an A record.
5. In cPanel, click **SSL/TLS Status** and run **AutoSSL** to enable HTTPS.

---

## 4. Setting Up Professional Branded Email for Walmart

Walmart reviewers check whether your support email matches your domain (e.g. `support@yourdomain.com` instead of `@gmail.com`):
1. Create a mailbox in Google Workspace, Microsoft 365, Zoho Mail, or cPanel Email.
2. Set up:
   - `support@yourdomain.com`
   - `sales@yourdomain.com`
3. Edit `data/settings.json` or visit `/admin` to update the email in the store configuration.
