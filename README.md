# VMC Operator HMI

Single-operator startup guidance HMI for a VMC machine, built with React + Vite.
Progress is saved to the browser's local storage, so a reload resumes where you left off.

## Run locally

```
npm install
npm run dev
```

## Deploy (Vercel — fastest path)

1. Push this folder to a new GitHub repository.
2. Go to vercel.com, sign in with GitHub, click "Add New Project".
3. Import the repository. Vercel auto-detects Vite — leave the default build settings.
4. Click Deploy. You'll get a live URL like `your-project.vercel.app` within a minute.

## Deploy (Netlify — alternative)

1. Push this folder to GitHub.
2. Go to netlify.com, "Add new site" > "Import an existing project".
3. Build command: `npm run build`, publish directory: `dist`.
4. Deploy — you'll get a live URL like `your-project.netlify.app`.

No login is required to use the app — it's a single-operator tool with no access restrictions.
