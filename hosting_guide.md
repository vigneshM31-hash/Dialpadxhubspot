# Hosting your React Application on Hostinger

This guide explains how to build your `demo-react-ts` project and deploy it to Hostinger.

## 1. Build the Application Locally

Before uploading, you need to generate the production-ready files.

1.  **Open your terminal** in the project directory:
    `c:\Users\VigneshM\OneDrive - Sandeza Inc\Desktop\dpxhb\calling-extensions-sdk-master\demos\demo-react-ts`
2.  **Install dependencies** (if you haven't already):
    ```powershell
    npm install
    ```
3.  **Run the build command**:
    ```powershell
    npm run build
    ```
    *Note: This will use the `webpack.config.js` to bundle your code.*

4.  **Verify the output**:
    After the build completes, a new folder named `dist` will be created in your project directory. This folder contains:
    - `demo-react-ts.html` (The entry point)
    - `demo-react-ts.bundle.js` (The bundled JavaScript)
    - `demo-react-ts.bundle.js.map` (Source map for debugging, optional)

## 2. Prepare for Hostinger

Hostinger typically expects an `index.html` file in the root directory (usually `public_html`).

> [!IMPORTANT]
> Your current webpack config names the HTML file `demo-react-ts.html`. You should rename it to `index.html` before uploading, or update your `webpack.config.js`.

### Option A: Manual Rename
After running `npm run build`, go to the `dist` folder and rename `demo-react-ts.html` to `index.html`.

### Option B: Update Webpack Config
If you want it to happen automatically, change line 13 in `webpack.config.js`:
```javascript
// Change this:
filename: "demo-react-ts.html",
// To this:
filename: "index.html",
```

## 3. Upload to Hostinger

There are two main ways to upload your files to Hostinger:

### Method 1: Using Hostinger File Manager (Recommended for small projects)
1.  Log in to your **Hostinger hPanel**.
2.  Go to **Websites** -> **Manage** -> **File Manager**.
3.  Navigate to the `public_html` directory.
4.  **Upload the contents** of your local `dist` folder (do not upload the `dist` folder itself, just what's inside).

### Method 2: Using FTP (FileZilla)
1.  Get your FTP credentials from **Hostinger hPanel** -> **Files** -> **FTP Accounts**.
2.  Connect using FileZilla.
3.  Drag and drop everything from your local `dist` folder into the `public_html` folder on the server.

## 4. Troubleshooting

*   **404 Not Found for proxy.php?** 
    - Ensure `.htaccess` and `proxy.php` are both in the `public_html` folder.
    - If the error persists, try calling the proxy with an explicit action: `proxy.php?action=contacts`.
    - I have updated `proxy.php` to be more robust, so rebuild and re-upload it.

*   **Dialpad CSP / frame-ancestors Error?**
    - This is a security block from Dialpad. You **must** whitelist your domain in the Dialpad Developer Portal.
    - Go to [Dialpad Developers](https://developers.dialpad.com/), select your app, and add your domain to the Whitelisted Domains.
    - **For Hostinger:** Add `https://magenta-swallow-580185.hostingersite.com`
    - **For Local Development:** Add `https://localhost:9025` (or whatever URL your `npm run dev` uses).

## 5. Deployment Step-by-Step (Fixing current errors)

1.  **Run Build**: `npm run build`
2.  **Upload**: Upload all files from `dist/` to Hostinger's `public_html`.
3.  **Whitelist**: Add your site to Dialpad's whitelist.
4.  **Refresh**: Hard refresh your Browser.
