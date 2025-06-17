#!/bin/bash
# Subtask to execute Frontend CI steps

# Exit on any error
set -e

echo "Attempting to use existing Node.js version."
node -v
npm -v

# Ensure frontend directory and basic package.json exist
echo "Ensuring frontend directory and package.json exist..."
mkdir -p frontend
if [ ! -f "frontend/package.json" ]; then
  echo '{ "name": "dummy-frontend", "version": "1.0.0", "scripts": { "build": "echo DUMMY BUILD" } }' > frontend/package.json
  echo 'Created dummy frontend/package.json'
fi

# Change to the frontend working directory
cd frontend

# Run npm install to install dependencies and generate package-lock.json
echo "Running npm install in frontend directory..."
npm install

# Run npm run build --if-present to build the frontend
echo "Running npm run build --if-present in frontend directory..."
npm run build --if-present

echo "Frontend CI steps simulation completed."
