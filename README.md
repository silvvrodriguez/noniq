# NoniQ

**Personal finance, made personal.**

NoniQ is a full-stack personal finance application designed to help users track their money, manage budgets, monitor savings goals, and understand their financial activity through a clean and responsive dashboard.

**Live App:** https://noniq-kappa.vercel.app/  
**API:** https://noniq.onrender.com/

---

## Features

- User registration and login
- JWT-based authentication
- Secure password hashing with bcrypt
- Income and expense tracking
- Custom transaction categories
- Transaction filtering
- Transaction editing and deletion
- CSV transaction export
- Financial dashboard
- Current balance overview
- Monthly income and expense summaries
- Spending breakdown by category
- Monthly financial analytics
- Budget creation and management
- Savings goal tracking
- Responsive design for desktop, tablet, and mobile
- Loading, error, retry, and authentication-expiration states
- Resource ownership protection
- Automated backend tests
- Continuous integration with GitHub Actions

---

## Tech Stack

### Frontend

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4
- Recharts

### Backend

- Node.js
- Express 5
- TypeScript
- Prisma ORM
- PostgreSQL
- Zod
- JSON Web Tokens
- bcrypt

### Testing

- Vitest
- Supertest

### Infrastructure

- Vercel — frontend
- Render — backend API
- Neon — PostgreSQL database
- GitHub Actions — CI

---

## Architecture

NoniQ uses a separated frontend and backend architecture.

```text
Browser
   │
   ▼
Next.js Frontend
   │
   │ REST API
   ▼
Express Backend
   │
   │ Prisma ORM
   ▼
PostgreSQL
```

The frontend communicates with the backend through authenticated HTTP requests.

The backend is responsible for:

- Authentication
- Authorization
- Request validation
- Financial business logic
- Database access
- Resource ownership checks
- Error handling

---

## Project Structure

```text
noniq/
├── .github/
│   └── workflows/
│
├── backend/
│   ├── prisma/
│   ├── src/
│   ├── package.json
│   └── ...
│
├── frontend/
│   ├── src/
│   ├── package.json
│   └── ...
│
└── README.md
```

---

## Dashboard

The dashboard gives users a quick overview of their personal finances.

It includes:

- Current balance
- Monthly income
- Monthly expenses
- Transaction activity
- Spending by category
- Monthly income vs. expense trends
- Recent transactions

Charts are rendered with Recharts.

---

## Transactions

Users can manage their financial activity from the transaction section.

Supported operations include:

- Create transactions
- Edit transactions
- Delete transactions
- Filter transaction history
- Assign categories
- Record income and expenses
- Export transaction data as CSV

All transactions belong to the authenticated user.

---

## Categories

Users can create and manage their own income and expense categories.

The backend enforces category ownership so users cannot access or modify categories belonging to another account.

Categories referenced by financial records are protected from deletion when removing them would violate data integrity.

---

## Budgets

Users can create and manage personal budgets to organize spending limits.

Budget resources are protected by authentication and ownership checks.

---

## Savings Goals

NoniQ allows users to create and manage savings goals and track progress toward financial objectives.

Users can:

- Create goals
- Edit goals
- Track saved amounts
- Delete goals

---

## Authentication & Security

NoniQ uses JWT-based authentication.

Passwords are hashed with bcrypt before being stored.

Protected API routes verify authentication before allowing access to private resources.

The backend also performs ownership checks so authenticated users can only access or modify their own:

- Transactions
- Categories
- Budgets
- Savings goals

Sensitive credentials and production secrets are stored in environment variables and are not committed to the repository.

---

## Validation & Error Handling

API request validation is handled with Zod.

The application includes handling for:

- Invalid input
- Missing authentication
- Expired or invalid sessions
- Unauthorized resource access
- Missing resources
- Data conflicts
- Network failures
- Unexpected server errors

The frontend provides loading, error, retry, and pending-action feedback to make these states clear to the user.

---

## Local Development

### Requirements

Make sure you have installed:

- Node.js
- npm
- PostgreSQL

Clone the repository:

```bash
git clone https://github.com/silvvrodriguez/noniq.git
cd noniq
```

### Backend

Enter the backend directory:

```bash
cd backend
```

Install dependencies:

```bash
npm install
```

Configure the required backend environment variables for:

- PostgreSQL connection
- JWT authentication
- Frontend origin

Generate the Prisma client and prepare the database using the project's Prisma configuration.

Start the development server:

```bash
npm run dev
```

Build the backend:

```bash
npm run build
```

Start the production build:

```bash
npm start
```

Run the automated tests:

```bash
npm test
```

Check formatting:

```bash
npm run format:check
```

### Frontend

From the project root:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Configure the API URL:

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
```

Start the development server:

```bash
npm run dev
```

The application will normally be available at:

```text
http://localhost:3000
```

Build the frontend:

```bash
npm run build
```

Run ESLint:

```bash
npm run lint
```

---

## Testing

The backend includes automated tests for major API behavior, including:

- Authentication
- Authorization
- Resource ownership
- Transactions
- Categories
- Budgets
- Savings goals
- Dashboard functionality
- Request validation
- Error scenarios

Run the test suite with:

```bash
cd backend
npm test
```

---

## Continuous Integration

NoniQ uses GitHub Actions for continuous integration.

The backend CI workflow automatically validates changes to help detect regressions before they are integrated into the project.

---

## Deployment

### Frontend

The Next.js frontend is deployed on Vercel.

https://noniq-kappa.vercel.app/

### Backend

The Express REST API is deployed on Render.

https://noniq.onrender.com/

### Database

Production data is stored in PostgreSQL hosted on Neon.

> NoniQ currently uses free-tier infrastructure. After a period of inactivity, the backend or database may require a few additional seconds to wake up.

The application provides loading feedback during this process so infrastructure startup time is clearly distinguished from an application failure.

---

## Design Goals

NoniQ was designed around several principles:

- Clear financial information
- Simple interaction flows
- Responsive layouts
- Consistent visual hierarchy
- Predictable error handling
- Explicit loading states
- Secure resource ownership
- Separation of frontend and backend responsibilities
- Maintainable TypeScript code
- Production-ready deployment workflow

---

## Project Status

NoniQ is an actively developed full-stack portfolio project.

The core personal finance functionality is implemented, tested, responsive, and deployed.

---

## Author

**Silvana Rodríguez**

Software Developer & Product Designer

GitHub: https://github.com/silvvrodriguez