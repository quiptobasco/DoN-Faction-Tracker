# Deployment Guide for Norrath Tracker

I've set up the infrastructure for your GitHub deployment. Follow these steps to get your prototype live for your friends:

## 1. Export Code to GitHub
1.  Open the **Settings** menu in the top-right of AI Studio.
2.  Select **GitHub** and connect your account.
3.  Choose **Push to Repository** to create a new repo with this code.

## 2. Authorized Domains (Firebase)
Your login will be blocked unless you tell Firebase your new website is safe.
1.  Go to the [Firebase Console](https://console.firebase.google.com/).
2.  Navigate to **Authentication** > **Settings** > **Authorized Domains**.
3.  Click **Add Domain** and enter your GitHub Pages URL (e.g., `quiptobasco.github.io`).

## 3. Enable GitHub Pages
1.  Go to your new repository on GitHub.
2.  Click **Settings** > **Pages**.
3.  Under **Build and deployment**, change the **Source** to **GitHub Actions**.
4.  The action I created (`.github/workflows/deploy.yml`) will now automatically build and publish your site whenever you push code!

## 4. Base Path (Optional)
If your site is hosted at a subdirectory like `quiptobasco.github.io/norrath-tracker/`, you should add an environment variable to your GitHub Action:
- Go to **Settings** > **Secrets and variables** > **Actions** > **Variables**.
- Add `VITE_BASE_PATH` with the value `/norrath-tracker/` (include the slashes).

---

### Alternative: The "Share" Button
If you want to skip GitHub entirely, simply click the **Share** button in the AI Studio header. It provides a live URL that works immediately without any extra configuration!
