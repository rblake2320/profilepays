# ProfilePays Campaign Marketplace API Documentation

## Overview

The Campaign Marketplace is the core feature of ProfilePays that enables advertisers to create campaigns and users to participate in them to earn money. This system provides a complete marketplace experience with advanced filtering, analytics, and earnings tracking.

## Database Schema

### Campaign Entity
```typescript
interface Campaign {
  id: string;
  title: string;
  description: string;
  brandName: string;
  brandLogo?: string;
  brandColor: string;
  payoutUSD: number;
  durationMinutes: number;
  category: CampaignCategory;
  network?: SocialNetwork;
  featured: boolean;
  status: CampaignStatus;
  maxParticipants?: number;
  currentParticipants: number;
  requirements?: CampaignRequirements;
  campaignUrl?: string;
  instructions?: string;
  tags?: string[];
  startDate?: Date;
  endDate?: Date;
  totalBudget?: number;
  spentBudget: number;
  approvalRequired: boolean;
  advertiserId: string;
  advertiser: User;
  participations: CampaignParticipation[];
  createdAt: Date;
  updatedAt: Date;
}
```

### Campaign Participation Entity
```typescript
interface CampaignParticipation {
  id: string;
  startTime?: Date;
  endTime?: Date;
  status: ParticipationStatus;
  earningsUSD: number;
  completionProof?: CompletionProof;
  approvalNotes?: string;
  rejectionReason?: string;
  durationActualMinutes?: number;
  progressPercentage: number;
  milestonesCompleted?: string[];
  paymentProcessed: boolean;
  paymentProcessedAt?: Date;
  reminderSent: boolean;
  reminderSentAt?: Date;
  userId: string;
  campaignId: string;
  user: User;
  campaign: Campaign;
  createdAt: Date;
  updatedAt: Date;
}
```

### Enums

```typescript
enum CampaignStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

enum CampaignCategory {
  SOCIAL_MEDIA = 'social_media',
  GAMING = 'gaming',
  SHOPPING = 'shopping',
  LIFESTYLE = 'lifestyle',
  FINANCE = 'finance',
  HEALTH = 'health',
  EDUCATION = 'education',
  ENTERTAINMENT = 'entertainment',
  TECHNOLOGY = 'technology',
  TRAVEL = 'travel',
  OTHER = 'other',
}

enum SocialNetwork {
  INSTAGRAM = 'instagram',
  TIKTOK = 'tiktok',
  YOUTUBE = 'youtube',
  FACEBOOK = 'facebook',
  TWITTER = 'twitter',
  LINKEDIN = 'linkedin',
  SNAPCHAT = 'snapchat',
  PINTEREST = 'pinterest',
  TWITCH = 'twitch',
  DISCORD = 'discord',
}

enum ParticipationStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
}
```

## API Endpoints

### Public Endpoints

#### Get All Campaigns
```http
GET /api/campaigns?page=1&limit=20&search=nike&category=lifestyle&featured=true
```

**Query Parameters:**
- `search?: string` - Search in title, description, brand name
- `category?: CampaignCategory` - Filter by category
- `network?: SocialNetwork` - Filter by social network
- `status?: CampaignStatus` - Filter by status (default: active)
- `minPayout?: number` - Minimum payout amount
- `maxPayout?: number` - Maximum payout amount
- `minDuration?: number` - Minimum duration in minutes
- `maxDuration?: number` - Maximum duration in minutes
- `featured?: boolean` - Filter featured campaigns
- `hasSpots?: boolean` - Only campaigns with available spots
- `tags?: string[]` - Filter by tags
- `page?: number` - Page number (default: 1)
- `limit?: number` - Items per page (default: 20)
- `sortBy?: string` - Sort field (default: createdAt)
- `sortOrder?: 'ASC' | 'DESC'` - Sort order (default: DESC)

**Response:**
```json
{
  "success": true,
  "message": "Campaigns retrieved successfully",
  "data": [
    {
      "id": "uuid",
      "title": "Nike Air Max Promotion",
      "description": "Create an Instagram story...",
      "brandName": "Nike",
      "brandLogo": "https://logo.clearbit.com/nike.com",
      "brandColor": "#FF6B00",
      "payoutUSD": 25.00,
      "durationMinutes": 30,
      "category": "lifestyle",
      "network": "instagram",
      "featured": true,
      "status": "active",
      "maxParticipants": 100,
      "currentParticipants": 25,
      "spotsRemaining": 75,
      "requirements": {
        "minFollowers": 1000,
        "minAge": 18,
        "verificationRequired": true
      },
      "campaignUrl": "https://nike.com/air-max",
      "instructions": "Post an Instagram story...",
      "tags": ["fashion", "sneakers", "lifestyle"],
      "startDate": "2024-01-01T00:00:00Z",
      "endDate": "2024-12-31T23:59:59Z",
      "totalBudget": 2500,
      "spentBudget": 625,
      "budgetRemaining": 1875,
      "approvalRequired": false,
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z",
      "isFull": false,
      "isActive": true,
      "isExpired": false,
      "advertiser": {
        "id": "uuid",
        "firstName": "John",
        "lastName": "Doe",
        "profileImage": "https://example.com/avatar.jpg"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1,
    "hasNext": false,
    "hasPrev": false
  }
}
```

#### Get Featured Campaigns
```http
GET /api/campaigns/featured?limit=10
```

#### Get Campaign Details
```http
GET /api/campaigns/:id
```

**Response (includes user-specific data if authenticated):**
```json
{
  "success": true,
  "message": "Campaign retrieved successfully",
  "data": {
    // Campaign data as above
    "userParticipation": {
      "id": "uuid",
      "status": "active",
      "startTime": "2024-01-01T10:00:00Z",
      "endTime": "2024-01-01T10:30:00Z",
      "earningsUSD": 25.00,
      "progressPercentage": 75,
      "timeRemaining": 8,
      // ... other participation fields
    },
    "eligibility": {
      "canJoin": true,
      "reason": null
    }
  }
}
```

### Authenticated User Endpoints

#### Join Campaign
```http
POST /api/campaigns/:id/join
Authorization: Bearer <jwt_token>
```

**Body:**
```json
{
  "metadata": {
    "userMessage": "Looking forward to this campaign!",
    "referralSource": "instagram",
    "socialProfiles": {
      "instagram": "@myusername",
      "tiktok": "@myusername"
    }
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Successfully joined campaign",
  "data": {
    "id": "uuid",
    "status": "active",
    "startTime": "2024-01-01T10:00:00Z",
    "endTime": "2024-01-01T10:30:00Z",
    "progressPercentage": 0,
    "timeRemaining": 30,
    "isActive": true,
    "isCompleted": false
  }
}
```

#### Complete Campaign
```http
POST /api/campaigns/participations/:id/complete
Authorization: Bearer <jwt_token>
```

**Body:**
```json
{
  "proof": {
    "screenshots": ["https://example.com/screenshot1.jpg"],
    "videoUrl": "https://example.com/video.mp4",
    "socialPostUrl": "https://instagram.com/p/xyz",
    "description": "Completed the campaign as requested"
  },
  "notes": "Had a great experience with this campaign!"
}
```

#### Get My Campaigns
```http
GET /api/campaigns/my-campaigns?status=active
Authorization: Bearer <jwt_token>
```

**Query Parameters:**
- `status?: ParticipationStatus` - Filter by participation status

**Response:**
```json
{
  "success": true,
  "message": "Your campaigns retrieved successfully",
  "data": [
    {
      "participation": {
        "id": "uuid",
        "status": "completed",
        "earningsUSD": 25.00,
        "progressPercentage": 100,
        "paymentProcessed": false
      },
      "campaign": {
        "id": "uuid",
        "title": "Nike Air Max Promotion",
        "brandName": "Nike",
        "payoutUSD": 25.00,
        "advertiser": {
          "id": "uuid",
          "firstName": "John",
          "lastName": "Doe"
        }
      }
    }
  ]
}
```

#### Get My Earnings
```http
GET /api/campaigns/my-earnings
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Earnings retrieved successfully",
  "data": {
    "totalEarnings": 150.00,
    "pendingEarnings": 25.00,
    "totalCampaigns": 10,
    "completedCampaigns": 8,
    "paidCampaigns": 7
  }
}
```

### Advertiser Endpoints

#### Create Campaign
```http
POST /api/campaigns
Authorization: Bearer <jwt_token>
```

**Body:**
```json
{
  "title": "Nike Air Max Promotion",
  "description": "Create an Instagram story showcasing your new Nike Air Max sneakers...",
  "brandName": "Nike",
  "brandLogo": "https://logo.clearbit.com/nike.com",
  "brandColor": "#FF6B00",
  "payoutUSD": 25.00,
  "durationMinutes": 30,
  "category": "lifestyle",
  "network": "instagram",
  "featured": false,
  "maxParticipants": 100,
  "requirements": {
    "minFollowers": 1000,
    "minAge": 18,
    "verificationRequired": true,
    "targetCountries": ["US", "CA"],
    "targetGenders": ["male", "female"]
  },
  "campaignUrl": "https://nike.com/air-max",
  "instructions": "Post an Instagram story featuring the Nike Air Max...",
  "tags": ["fashion", "sneakers", "lifestyle", "instagram"],
  "startDate": "2024-01-01T00:00:00Z",
  "endDate": "2024-12-31T23:59:59Z",
  "totalBudget": 2500,
  "approvalRequired": false
}
```

#### Update Campaign
```http
PUT /api/campaigns/:id
Authorization: Bearer <jwt_token>
```

#### Delete Campaign
```http
DELETE /api/campaigns/:id
Authorization: Bearer <jwt_token>
```

#### Get Advertiser Dashboard
```http
GET /api/campaigns/advertiser-dashboard
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Advertiser campaigns retrieved successfully",
  "data": [
    {
      "id": "uuid",
      "title": "Nike Air Max Promotion",
      "status": "active",
      "currentParticipants": 25,
      "maxParticipants": 100,
      "spentBudget": 625,
      "totalBudget": 2500,
      "participationsCount": 30,
      "activeParticipations": 5,
      "completedParticipations": 25
    }
  ]
}
```

#### Get Campaign Analytics
```http
GET /api/campaigns/:id/analytics
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Campaign analytics retrieved successfully",
  "data": {
    "campaign": {
      // Campaign details
    },
    "totalParticipants": 30,
    "activeParticipants": 5,
    "completedParticipants": 25,
    "cancelledParticipants": 0,
    "totalEarningsPaid": 625.00,
    "averageCompletionTime": 28,
    "conversionRate": 83.33
  }
}
```

#### Approve/Reject Participation (for approval-required campaigns)
```http
PATCH /api/campaigns/participations/:id/approve
Authorization: Bearer <jwt_token>
```

```json
{
  "earnings": 25.00,
  "notes": "Great work on this campaign!"
}
```

```http
PATCH /api/campaigns/participations/:id/reject
Authorization: Bearer <jwt_token>
```

```json
{
  "reason": "Content did not meet requirements"
}
```

### Admin Endpoints

#### Bulk Operations
```http
PATCH /api/campaigns/bulk/status
Authorization: Bearer <jwt_token>
```

```json
{
  "campaignIds": ["uuid1", "uuid2"],
  "status": "paused"
}
```

```http
POST /api/campaigns/bulk/feature
Authorization: Bearer <jwt_token>
```

```json
{
  "campaignIds": ["uuid1", "uuid2"],
  "featured": true
}
```

## Business Logic

### Campaign Eligibility
The system automatically checks if a user can join a campaign based on:

1. **Campaign Status**: Must be active
2. **Expiration**: Campaign must not be expired
3. **Capacity**: Campaign must not be full
4. **Ownership**: Users cannot join their own campaigns
5. **Requirements**: Age, follower count, verification status
6. **Previous Participation**: Users cannot join the same campaign twice

### Automatic Campaign Management
- **Expiration**: Active participations are automatically expired when time runs out
- **Completion**: Campaigns are automatically marked as completed when end date is reached
- **Budget Tracking**: Spent budget is tracked automatically when users are paid

### Earnings Calculation
- Base earnings equal the campaign payout
- Earnings can be adjusted during approval process for approval-required campaigns
- Payments are tracked separately from earnings for accounting purposes

### Search and Discovery
The system provides advanced filtering and search capabilities:
- Full-text search across title, description, and brand name
- Category and network filtering
- Payout and duration range filtering
- Featured campaign promotion
- Tag-based discovery
- Availability filtering (campaigns with spots remaining)

## Security Features

### Authorization
- **Public Access**: Campaign browsing and details
- **User Access**: Joining campaigns, viewing earnings
- **Advertiser Access**: Creating and managing campaigns
- **Admin Access**: Bulk operations and system management

### Validation
- Comprehensive input validation using class-validator
- Business rule validation (dates, budgets, requirements)
- SQL injection protection through TypeORM
- Rate limiting through NestJS throttler

### Data Protection
- Sensitive user data is excluded from public responses
- JWT-based authentication for all protected endpoints
- Role-based access control for different user types

## Performance Optimizations

### Database Indexing
- Composite indexes on frequently queried combinations
- Individual indexes on filter fields
- Foreign key indexes for joins

### Query Optimization
- Selective field loading for list views
- Eager loading for related data when needed
- Pagination to limit result sets
- Query builders for complex filtering

### Caching Strategy
- Campaign list caching for public endpoints
- User-specific data caching for dashboard views
- Analytics result caching for advertiser dashboards

## Integration Points

### Payment Processing
The campaign system is designed to integrate with payment processors:
- Earnings tracking separate from payment processing
- Payment status tracking for reconciliation
- Bulk payment processing capabilities

### Notification System
Integration points for notifications:
- Campaign join confirmations
- Campaign completion reminders
- Payment processing notifications
- Campaign status updates

### Analytics and Reporting
- Built-in analytics for campaign performance
- Earnings summaries for users
- Conversion tracking and optimization metrics
- Export capabilities for external analysis

## Error Handling

The API uses standard HTTP status codes and provides detailed error messages:

### Common Error Responses
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "payoutUSD",
      "message": "Payout must be between 0.01 and 10000"
    }
  ]
}
```

### Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `401` - Unauthorized
- `403` - Forbidden (role-based access)
- `404` - Not Found
- `409` - Conflict (duplicate participation)
- `422` - Unprocessable Entity
- `500` - Internal Server Error

## Testing

The system includes comprehensive tests:
- Unit tests for service methods
- Integration tests for API endpoints
- E2E tests for complete workflows
- Performance tests for high-load scenarios

## Deployment Considerations

### Environment Variables
```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_NAME=profilepays
JWT_SECRET=your_jwt_secret
NODE_ENV=production
```

### Database Migrations
Run migrations before deployment:
```bash
npm run migration:run
```

### Seed Data
Optional seed data for development:
```bash
npm run seed:run
```

This completes the comprehensive Campaign Marketplace system for ProfilePays!