@echo off
echo ==================================================
echo   ProfilePays Docker PostgreSQL Setup
echo ==================================================
echo.

echo 1. Stopping any existing PostgreSQL containers...
docker stop profilepays-postgres 2>nul
docker rm profilepays-postgres 2>nul

echo.
echo 2. Starting PostgreSQL container...
docker run -d ^
  --name profilepays-postgres ^
  -e POSTGRES_DB=profilepays ^
  -e POSTGRES_USER=postgres ^
  -e POSTGRES_PASSWORD=?Booker78! ^
  -p 5433:5432 ^
  postgres:16

if %errorlevel% neq 0 (
    echo ❌ Failed to start PostgreSQL container
    pause
    exit /b 1
)

echo.
echo 3. Waiting for PostgreSQL to start...
timeout /t 10

echo.
echo 4. Testing connection...
docker exec profilepays-postgres psql -U postgres -d profilepays -c "\l"

if %errorlevel% neq 0 (
    echo ❌ Failed to connect to PostgreSQL container
    pause
    exit /b 1
)

echo.
echo ✅ PostgreSQL container is running successfully!
echo.
echo 📋 Connection details:
echo    Host: localhost
echo    Port: 5433 (Note: different from default 5432)
echo    Database: profilepays
echo    Username: postgres
echo    Password: ?Booker78!
echo.
echo 💡 Update your .env file to use port 5433
echo.
pause
