@echo off
echo ==================================================
echo   PostgreSQL Password Reset Helper
echo ==================================================
echo.
echo This script will help you reset the PostgreSQL password.
echo You need to run this as Administrator.
echo.
echo Current password issue: SCRAM-SHA-256 authentication failing
echo Target password: ?Booker78!
echo.
echo Step 1: Stopping PostgreSQL service...
net stop postgresql-x64-16
if %errorlevel% neq 0 (
    echo ❌ Failed to stop PostgreSQL service. Run as Administrator.
    pause
    exit /b 1
)

echo.
echo Step 2: Backing up pg_hba.conf...
copy "C:\Program Files\PostgreSQL\16\data\pg_hba.conf" "C:\Program Files\PostgreSQL\16\data\pg_hba.conf.backup"

echo.
echo Step 3: Creating temporary trust configuration...
powershell -Command "(Get-Content 'C:\Program Files\PostgreSQL\16\data\pg_hba.conf') -replace 'scram-sha-256', 'trust' | Set-Content 'C:\Program Files\PostgreSQL\16\data\pg_hba.conf'"

echo.
echo Step 4: Starting PostgreSQL with trust authentication...
net start postgresql-x64-16

echo.
echo Step 5: Setting new password...
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d postgres -c "ALTER USER postgres PASSWORD '?Booker78!';"

echo.
echo Step 6: Restoring original authentication configuration...
copy "C:\Program Files\PostgreSQL\16\data\pg_hba.conf.backup" "C:\Program Files\PostgreSQL\16\data\pg_hba.conf"

echo.
echo Step 7: Restarting PostgreSQL with original configuration...
net stop postgresql-x64-16
net start postgresql-x64-16

echo.
echo ✅ Password reset complete! Testing connection...
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d postgres -c "\l"

echo.
echo 🎉 If no errors above, password has been reset successfully!
echo You can now use password: ?Booker78!
echo.
pause
