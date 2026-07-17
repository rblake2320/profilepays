# ProfilePays Backend

A production-ready NestJS backend API for ProfilePays with comprehensive authentication system.

## Features

### 🔐 Authentication & Security
- JWT-based authentication with refresh tokens
- Password hashing with bcrypt (12 rounds)
- Email verification system
- Rate limiting and throttling
- Security headers with Helmet
- CORS configuration
- Role-based access control (RBAC)

### 📊 User Management
- User registration and login
- Profile management
- User roles (Member, Advertiser, Admin)
- Account deactivation
- User statistics and admin endpoints

### 🛡️ Security Features
- HTTP-only refresh token cookies
- Automatic token cleanup
- Session management
- IP and User-Agent tracking
- Password strength validation

## Technology Stack

- **Framework**: NestJS
- **Database**: PostgreSQL with TypeORM
- **Authentication**: JWT + Passport
- **Validation**: class-validator
- **Documentation**: Swagger/OpenAPI
- **Testing**: Jest
- **Security**: Helmet, CORS, Rate Limiting

## Quick Start

### Prerequisites

- Node.js >= 18.0.0
- PostgreSQL 16.6
- npm >= 8.0.0

### Installation

1. **Install dependencies**
   ```bash
   cd backend
   npm install
   ```

2. **Database Setup**
   ```bash
   # Create database
   createdb profilepays

   # Or using psql
   psql -U postgres
   CREATE DATABASE profilepays;
   \q
   ```

3. **Environment Configuration**
   ```bash
   # Copy environment template
   cp .env.example .env

   # Edit .env with your settings
   nano .env
   ```

4. **Database Migration**
   ```bash
   # Run migrations
   npm run migration:run
   ```

5. **Start Development Server**
   ```bash
   npm run start:dev
   ```

   The API will be available at http://localhost:3001

6. **View API Documentation**

   Swagger docs: http://localhost:3001/api/docs

## Environment Variables

```env
# Application
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:3000

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=CHANGE_ME_db_password
DB_NAME=profilepays

# Security
JWT_SECRET=your-super-secure-jwt-secret-key

# Rate Limiting
THROTTLE_TTL=60
THROTTLE_LIMIT=10
```

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - Logout current session
- `POST /api/auth/logout-all` - Logout all sessions
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/verify-email` - Verify email address
- `POST /api/auth/resend-verification` - Resend verification email
- `GET /api/auth/me` - Get current user from token

### User Management
- `GET /api/users/me` - Get current user profile
- `PUT /api/users/me` - Update user profile
- `DELETE /api/users/me` - Deactivate account
- `GET /api/users` - List users (Admin only)
- `GET /api/users/stats` - User statistics (Admin only)

## Database Schema

### Users Table
```sql
- id (UUID, Primary Key)
- email (Unique, Not Null)
- password_hash (Not Null)
- first_name, last_name (Not Null)
- user_role (ENUM: member, advertiser, admin)
- profile_image, phone_number, date_of_birth (Optional)
- is_verified, is_active (Boolean)
- email_verification_token, password_reset_token
- last_login_at, created_at, updated_at
```

### Refresh Tokens Table
```sql
- id (UUID, Primary Key)
- token (Unique, Not Null)
- user_id (Foreign Key to users)
- expires_at (Not Null)
- is_revoked, revoked_at
- user_agent, ip_address
- created_at
```

## Testing

```bash
# Run unit tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:cov

# Run e2e tests
npm run test:e2e
```

## Database Operations

```bash
# Generate new migration
npm run migration:generate -- -n MigrationName

# Run pending migrations
npm run migration:run

# Revert last migration
npm run migration:revert

# Run database seeds
npm run seed:run
```

## Project Structure

```
src/
├── auth/
│   ├── decorators/          # Custom decorators
│   ├── dto/                 # Data transfer objects
│   ├── entities/            # Database entities
│   ├── guards/              # Authentication guards
│   ├── strategies/          # Passport strategies
│   ├── auth.controller.ts   # Auth endpoints
│   ├── auth.service.ts      # Auth business logic
│   └── auth.module.ts       # Auth module
├── users/
│   ├── dto/                 # User DTOs
│   ├── entities/            # User entities
│   ├── users.controller.ts  # User endpoints
│   ├── users.service.ts     # User business logic
│   └── users.module.ts      # User module
├── database/
│   ├── migrations/          # Database migrations
│   └── database.module.ts   # Database config
├── app.module.ts           # Root module
└── main.ts                 # Application entry point
```

## Security Features

### Password Security
- Minimum 8 characters
- Must contain uppercase, lowercase, number, and special character
- Hashed with bcrypt (12 rounds)

### Token Management
- Access tokens: 15 minutes expiration
- Refresh tokens: 7 days expiration
- Automatic cleanup of expired tokens
- Device tracking with IP and User-Agent

### Rate Limiting
- 10 requests per minute per IP
- Configurable via environment variables

### Data Validation
- Input sanitization
- SQL injection prevention
- XSS protection
- CORS configuration

## Production Deployment

### Environment Setup
```env
NODE_ENV=production
JWT_SECRET=generate-strong-secret-key
DB_PASSWORD=strong-production-password
```

### Build and Start
```bash
npm run build
npm run start:prod
```

### Database Migration
```bash
npm run migration:run
```

## Development

### Code Style
```bash
# Format code
npm run format

# Lint code
npm run lint
```

### Adding New Features

1. Create DTOs for validation
2. Add database entities if needed
3. Create/update services for business logic
4. Add controllers for API endpoints
5. Write tests for new functionality
6. Update documentation

## API Authentication

### Registration
```javascript
POST /api/auth/signup
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe",
  "userRole": "member"
}
```

### Login
```javascript
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

### Using Protected Endpoints
```javascript
GET /api/users/me
Authorization: Bearer <access_token>
```

## Error Handling

The API returns consistent error responses:

```json
{
  "statusCode": 400,
  "message": ["password must be longer than or equal to 8 characters"],
  "error": "Bad Request"
}
```

## Support

For issues and questions:
- Check the API documentation at `/api/docs`
- Review the test files for usage examples
- Check environment variable configuration

## License

MIT License