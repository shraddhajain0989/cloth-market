# Deployment Guide

## Frontend

- Deploy `client` to Vercel.
- Set `VITE_API_URL` to the deployed Render backend URL plus `/api`.

## Backend

- Deploy `server` to Render as a Node service.
- Configure `PORT`, `CLIENT_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, and `MONGODB_URI`.
- Add Cloudinary, Stripe, and Razorpay credentials when enabling provider integrations.

## Migration Strategy

- Keep the current static site available as a fallback until the React client is fully adopted.
- Point production traffic to the React app once API-backed flows are validated.
