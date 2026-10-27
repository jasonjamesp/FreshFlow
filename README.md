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
