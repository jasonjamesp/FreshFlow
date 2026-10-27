# FreshFlow

FreshFlow is an AI-powered retail expiry campaign platform built to help stores reduce waste, monitor stock health, and generate targeted campaigns for products nearing expiration.

The project combines a React frontend with an Express backend and uses MySQL for retail data and Google Gemini for AI-driven recommendations.

## Overview

FreshFlow helps teams:

- Track inventory and product batches
- Monitor customer purchase patterns
- Highlight expiring products by urgency
- Generate discount, bundle, and notification campaigns
- Review campaign lifecycle and performance
- Use AI suggestions to recommend customer promotions

## Tech Stack

- Frontend: React + Vite
- Backend: Node.js + Express
- Database: MySQL
- AI: Google Gemini via the Google GenAI SDK

## Project Structure

```text
FreshFlow/
├── Backend/                 # Express API + MySQL logic
│   ├── routes/              # API route handlers
│   ├── .env.example         # Sample backend env file
│   ├── campaignAgent.js     # Gemini-driven campaign generation
│   ├── calculations.js      # Expiry and pricing formulas
│   ├── db.js                # MySQL connection config
│   ├── server.js            # Main backend entry point
│   └── package.json
├── Frontend/
│   └── my-react-app/        # Vite + React UI
│       ├── src/
│       ├── package.json
│       └── README.md
└── README.md
```

## Features

### Dashboard
- Summary cards for urgent products, active campaigns, and inventory totals
- Expiry alerts sorted by urgency
- Recent campaign overview

### Products & inventory
- Product catalog with batch-level stock information
- Expiry dates and urgency scoring
- Inventory and stock status tracking

### Customers
- Customer activity and purchase history
- Customer-based campaign targeting

### Expiry tracking
- Days until expiry calculation
- Risk scoring for near-expiry stock
- Stock health indicators such as low stock or expired batches

### Campaign management
- Create, review, and transition campaign statuses
- Support for campaign actions such as discount, bundle, and notify
- AI-generated recommendations grounded in product and customer evidence

### Performance
- Campaign and sales performance metrics
- Track the impact of offers and promotions

## Backend API

The backend exposes endpoints under `/api` including:

- `GET /api/health` — health check
- `POST /api/ai` — raw Gemini prompt endpoint
- `POST /api/campaigns/generate` — generate AI campaigns
- `GET /api/dashboard` — dashboard metrics and alerts
- `GET /api/products` — inventory overview
- `GET /api/customers` — customer data
- `GET /api/expiry` — expiry tracking data
- `GET /api/campaigns` — list campaigns
- `PATCH /api/campaigns/:id/status` — update campaign status
- `GET /api/performance` — performance analytics

## Prerequisites

Before running the app, install:

- Node.js 18+
- npm
- MySQL
- A Google Gemini API key

## Environment Setup

Create a `.env` file in the `Backend` folder based on `.env.example`:

```env
PORT=5001
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=retail_expiry_campaigner
GEMINI_API_KEY=your_gemini_api_key
```

The backend will still start without a Gemini key, but AI-powered campaign generation will be unavailable until it is configured.

## Installation

### 1) Install backend dependencies

```bash
cd Backend
npm install
```

### 2) Install frontend dependencies

```bash
cd Frontend/my-react-app
npm install
```

## Running the App

### Start the backend

```bash
cd Backend
npm run dev
```

The backend runs on:

```text
http://localhost:5001
```

### Start the frontend

```bash
cd Frontend/my-react-app
npm run dev
```

The frontend typically runs on:

```text
http://localhost:5173
```

## Database Notes

The backend uses a MySQL database named `retail_expiry_campaigner` by default, with tables such as:

- `products`
- `inventory_batch`
- `customer`
- `campaign`

Make sure the database exists before starting the backend.

## License

This project currently does not include a license file. If you plan to share or deploy it publicly, add a license that matches your usage and distribution requirements.

## Notes

This is a practical retail decision-support app focused on reducing expiry waste while improving promotional targeting. The AI layer is designed to recommend customer-facing campaigns based on product urgency and customer buying behavior.
