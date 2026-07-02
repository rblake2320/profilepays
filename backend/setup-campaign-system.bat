@echo off
echo ==================================================
echo   ProfilePays Campaign Marketplace Setup
echo ==================================================
echo.

echo 1. Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo ❌ Failed to install dependencies
    pause
    exit /b 1
)
echo ✅ Dependencies installed
echo.

echo 2. Checking database connection...
echo Make sure PostgreSQL is running on localhost:5432
echo Database: profilepays
echo Username: postgres
echo Password: ?Booker78!
echo.
pause

echo 3. Running database migrations...
call npm run migration:run
if %errorlevel% neq 0 (
    echo ❌ Failed to run migrations
    echo 💡 Make sure database exists and credentials are correct
    pause
    exit /b 1
)
echo ✅ Migrations completed
echo.

echo 4. Would you like to add sample campaign data? (Y/N)
set /p seeddata=
if /i "%seeddata%"=="Y" (
    echo Running seed data...
    node -e "
    const { seedCampaigns } = require('./src/database/seeds/campaign-seeds');
    const { DataSource } = require('typeorm');
    const dataSource = new DataSource({
        type: 'postgres',
        host: 'localhost',
        port: 5432,
        username: 'postgres',
        password: '?Booker78!',
        database: 'profilepays',
        entities: ['src/**/*.entity.ts'],
        synchronize: false,
    });
    dataSource.initialize().then(async () => {
        await seedCampaigns(dataSource);
        await dataSource.destroy();
        console.log('✅ Sample campaigns added');
    }).catch(console.error);
    "
    echo ✅ Sample data added
)
echo.

echo 5. Starting development server...
echo The server will start on http://localhost:3000
echo.
echo 📋 Available endpoints:
echo    GET  /api/campaigns          - Browse campaigns (public)
echo    GET  /api/campaigns/featured - Featured campaigns (public)
echo    POST /api/campaigns/:id/join - Join campaign (requires auth)
echo    GET  /api/campaigns/my-campaigns - User campaigns (requires auth)
echo    GET  /api/campaigns/my-earnings - User earnings (requires auth)
echo    POST /api/campaigns          - Create campaign (advertisers only)
echo.
echo 🚀 Starting server now...
echo.

call npm run start:dev