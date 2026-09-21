# Cloth Market 2.0

Cloth Market has been upgraded from a static localStorage fashion storefront into a modular full-stack FashionTech platform scaffold with a React client and Express API.

## What’s Included

- React + Vite frontend with Tailwind, Framer Motion, React Router, Axios, Zustand, and Recharts
- Express backend with modular routes, JWT auth scaffolding, rate limiting, and role checks
- Startup-style pages for shopping, rentals, profile, social feed, AI lab, and admin analytics
- Environment variable samples, setup guide, deployment guide, and API docs
- Legacy HTML/CSS/JS app preserved in the repo to avoid breaking the current implementation during migration

## Workspaces

- `client`
- `server`

## Quick Start

1. `npm install`
2. `npm run dev:server`
3. `npm run dev:client`

## Demo Accounts

- `user@example.com / User@123`
- `admin@example.com / Admin@123`
- `master@example.com / Master@123`

## Current Architecture Note

The new backend currently runs with an in-memory development store so the migrated product can run without external infrastructure in this repo. MongoDB Atlas, Cloudinary, Stripe, Razorpay, and Google auth are scaffolded through environment variables and modular endpoints for the next hardening pass.
