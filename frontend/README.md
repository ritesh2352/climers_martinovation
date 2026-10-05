# Climers frontend

React and Vite client for the Climers authentication API.

## Run locally

Run these commands from the repository root:

1. Configure `backend/.env` with `MONGO_URI` and `JWT_SECRET`. Set
   `FRONTEND_URL` to the frontend origin when using direct cross-origin requests.
2. Start the backend:

   ```sh
   cd backend
   npm install
   npm start
   ```

   The backend listens on port `3000` by default.
3. In another terminal, start the frontend:

   ```sh
   cd frontend
   npm install
   npm run dev
   ```

The Vite development server proxies `/api` requests to `http://localhost:3000`.
Set `BACKEND_URL` if the backend runs on a different address. For production
builds, set `VITE_API_URL` to the backend's public origin.

## Available screens

- `/register` creates an account through `POST /api/auth/register`.
- `/login` signs in through `POST /api/auth/login`.
- `/` displays the signed-in account and supports signing out.

Interview pages and API endpoints are not present in this workspace yet.
