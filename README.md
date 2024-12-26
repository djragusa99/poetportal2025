# PoetPortal - Local Development Setup

## Prerequisites
- Node.js v18 or later
- PostgreSQL v14 or later
- npm (comes with Node.js)

## Setup Instructions

### 1. Clone the Repository
Clone this repository to your local machine.

### 2. Install Dependencies
```bash
npm install
```

### 3. Set up PostgreSQL
1. Create a new PostgreSQL database for the project
2. Create a `.env` file in the root directory with the following content:
```
DATABASE_URL=postgresql://[user]:[password]@localhost:5432/[database_name]
```
Replace `[user]`, `[password]`, and `[database_name]` with your PostgreSQL credentials.

### 4. Push Database Schema
```bash
npm run db:push
```
This will create all necessary tables in your database.

### 5. Start the Development Server
```bash
npm run dev
```

The application will be available at `http://localhost:5000`.

## Project Structure
- `/client` - React frontend code
- `/server` - Express backend code
- `/db` - Database schema and configuration

## Available Scripts
- `npm run dev` - Start the development server
- `npm run build` - Build the project for production
- `npm run db:push` - Push schema changes to the database
- `npm run check` - Type-check the project

## Features
- User authentication (login/register)
- Post creation and viewing
- Events management
- Points of interest
- Poetry resources
- Organization profiles
