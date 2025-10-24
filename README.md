# ProfilePays

**Turn your profile into profit.**

ProfilePays is a production-ready social-advertising platform that pays users for temporarily swapping their profile pictures with brand-sponsored images while giving businesses self-service tooling to launch targeted campaigns.

## Features

- Complete authentication system with JWT
- Campaign creation and management for businesses
- Campaign marketplace for users to browse and join
- Secure payment processing with Stripe
- User earnings tracking and PayPal payouts
- File upload and management for profile pictures
- Real-time dashboard and analytics
- Responsive Material-UI design
- Docker-ready deployment
- Comprehensive API documentation with Swagger

## Project Vision

### Planned Tech Stack
| Layer        | Planned Technology | Rationale |
|--------------|-------------------|-----------|
| Front-end    | React + Redux Toolkit, Material-UI, Axios, React Router, React Hook Form | Component-based UI and strong ecosystem |
| Back-end     | NestJS (TypeScript), TypeORM, PostgreSQL | Modular architecture & typed safety |
| Auth         | JWT + OAuth2 (social log-ins) | Stateless, scalable |
| Payments     | Stripe (subscriptions) & PayPal/Payoneer (payouts) | Covers both sides of the marketplace |
| CI/CD        | GitHub Actions (build, test, Docker) | Automated quality gates |
| Container    | Docker (+ optional K8s) | Consistent deployment |

### Planned Features
* Multi-step user & business onboarding  
* Campaign marketplace with earnings tracking  
* Tier-based subscription & reward system  
* Real-time analytics dashboards  
* REST API documented with Swagger / OpenAPI  
* Secure profile-picture swap verification  

## Repository Structure

This repository contains:
- 📋 Project documentation and planning
- 🔧 GitHub templates (issues, PRs)
- ⚙️ CI/CD workflow templates
- 📝 Contributing guidelines
- 📄 License and legal documents

## Quick Start

### Prerequisites

- Node.js 18+ and npm 8+
- PostgreSQL 15+ (or use Docker)
- Redis (optional, for caching)

### Installation

```bash
# Clone the repository
git clone https://github.com/rblake2320/profilepays.git
cd profilepays

# Install all dependencies
npm install

# Set up environment variables
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# Edit the .env files with your configuration
```

### Development

```bash
# Run both frontend and backend in development mode
npm run dev

# Or run them separately
npm run dev:frontend  # Frontend at http://localhost:3000
npm run dev:backend   # Backend at http://localhost:3001

# API Documentation available at http://localhost:3001/api/docs
```

### Using Docker

```bash
# Start all services
docker-compose up --build

# Stop services
docker-compose down

# Development mode
docker-compose -f docker-compose.dev.yml up
```

## Testing

```bash
# Run all tests
npm test

# Run frontend tests
npm run test:frontend

# Run backend tests
npm run test:backend

# Run with coverage
npm run test:coverage

# Run CI tests
npm run test:ci
```

## Building for Production

```bash
# Build both frontend and backend
npm run build

# Build separately
npm run build:frontend
npm run build:backend
```

## Project Structure

```
profilepays/
├── backend/                 # NestJS backend API
│   ├── src/
│   │   ├── auth/           # Authentication module
│   │   ├── users/          # User management
│   │   ├── campaigns/      # Campaign management
│   │   ├── payments/       # Payment processing
│   │   ├── files/          # File upload
│   │   └── main.ts         # App entry point
│   └── package.json
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/    # Reusable components
│   │   ├── pages/         # Page components
│   │   ├── store/         # Redux store
│   │   ├── services/      # API services
│   │   └── App.tsx
│   └── package.json
├── docker/                # Docker configuration
├── .github/workflows/     # CI/CD pipelines
└── package.json          # Root package.json
```

## API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login user
- `GET /api/v1/auth/me` - Get current user

### Campaigns
- `GET /api/v1/campaigns` - List all campaigns
- `GET /api/v1/campaigns/:id` - Get campaign details
- `POST /api/v1/campaigns` - Create campaign (Business only)
- `PUT /api/v1/campaigns/:id` - Update campaign
- `POST /api/v1/campaigns/:id/join` - Join campaign
- `GET /api/v1/campaigns/my-campaigns` - Get user's campaigns
- `GET /api/v1/campaigns/participations` - Get user's participations

### Users
- `GET /api/v1/users/:id` - Get user profile
- `PUT /api/v1/users/:id` - Update user profile

### Payments
- `POST /api/v1/payments/create-intent` - Create payment intent
- `POST /api/v1/payments/payout` - Request payout
- `GET /api/v1/payments/my-payments` - Get payment history

### Files
- `POST /api/v1/files/upload` - Upload file
- `DELETE /api/v1/files/:filename` - Delete file

Full API documentation available at `/api/docs` when running the backend.

## Environment Variables

### Backend (.env)
```
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:3000

DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=profilepays

JWT_SECRET=your-secret-key
JWT_EXPIRATION=7d

STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Frontend (.env)
```
VITE_API_URL=http://localhost:3001/api/v1
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Run tests: `npm test`
5. Run linting: `npm run lint`
6. Commit your changes: `git commit -m 'Add amazing feature'`
7. Push to the branch: `git push origin feature/amazing-feature`
8. Open a Pull Request

All contributions must pass CI checks including linting, type checking, and tests.

## License

MIT – see [`LICENSE`](LICENSE)."
