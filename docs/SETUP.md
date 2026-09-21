# Setup Guide

## Install

1. Run `npm install` at the repo root.
2. Copy `client/.env.example` to `client/.env`.
3. Copy `server/.env.example` to `server/.env`.

## Start

1. Run `npm run dev:server`
2. Run `npm run dev:client`

## Notes

- The current server boots with an in-memory store for fast local development.
- MongoDB Atlas, Cloudinary, Stripe, and Razorpay env vars are scaffolded for the next integration step.
- The legacy static HTML app remains in the repo so existing flows are preserved during migration.
