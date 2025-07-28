#!/bin/bash

# ProfilePays Development Setup Script
# This script will help set up the development environment

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check Node.js version
check_node_version() {
    if command_exists node; then
        NODE_VERSION=$(node --version | cut -d 'v' -f 2)
        MAJOR_VERSION=$(echo $NODE_VERSION | cut -d '.' -f 1)
        
        if [ "$MAJOR_VERSION" -ge 18 ]; then
            print_success "Node.js $NODE_VERSION is installed and compatible"
            return 0
        else
            print_warning "Node.js $NODE_VERSION is installed but version 18+ is recommended"
            return 1
        fi
    else
        print_error "Node.js is not installed"
        return 1
    fi
}

# Function to install Node.js using NVM
install_node() {
    if ! command_exists nvm; then
        print_status "Installing NVM (Node Version Manager)..."
        curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
        export NVM_DIR="$HOME/.nvm"
        [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
        [ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"
    fi
    
    print_status "Installing Node.js 20..."
    nvm install 20
    nvm use 20
    nvm alias default 20
}

# Function to setup environment file
setup_env_file() {
    if [ ! -f ".env" ]; then
        if [ -f ".env.example" ]; then
            print_status "Creating .env file from .env.example..."
            cp .env.example .env
            print_warning "Please update .env file with your actual configuration values"
        else
            print_warning ".env.example file not found, skipping .env creation"
        fi
    else
        print_success ".env file already exists"
    fi
}

# Function to setup Docker
setup_docker() {
    if command_exists docker; then
        print_success "Docker is already installed"
        
        if command_exists docker-compose; then
            print_success "Docker Compose is already installed"
        else
            print_warning "Docker Compose is not installed"
            print_status "Please install Docker Compose manually"
        fi
    else
        print_warning "Docker is not installed"
        print_status "Please install Docker manually from https://docs.docker.com/get-docker/"
    fi
}

# Function to setup PostgreSQL
setup_postgresql() {
    if command_exists psql; then
        print_success "PostgreSQL client is installed"
    else
        print_warning "PostgreSQL client is not installed"
        
        # Check OS and provide installation instructions
        if [[ "$OSTYPE" == "darwin"* ]]; then
            print_status "On macOS, install with: brew install postgresql"
        elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
            print_status "On Ubuntu/Debian, install with: sudo apt-get install postgresql-client"
            print_status "On CentOS/RHEL, install with: sudo yum install postgresql"
        fi
    fi
}

# Function to setup Git hooks
setup_git_hooks() {
    if [ -d ".git" ]; then
        print_status "Setting up Git hooks..."
        
        # Install husky if package.json exists and has husky
        if [ -f "package.json" ] && grep -q "husky" package.json; then
            print_status "Installing Husky Git hooks..."
            npm run prepare 2>/dev/null || print_warning "Could not install Husky hooks"
        fi
        
        print_success "Git hooks setup completed"
    else
        print_warning "Not a Git repository, skipping Git hooks setup"
    fi
}

# Function to install project dependencies
install_dependencies() {
    # Install root dependencies if package.json exists
    if [ -f "package.json" ]; then
        print_status "Installing root dependencies..."
        npm install
        print_success "Root dependencies installed"
    fi
    
    # Install frontend dependencies
    if [ -d "frontend" ] && [ -f "frontend/package.json" ]; then
        print_status "Installing frontend dependencies..."
        cd frontend
        npm install
        cd ..
        print_success "Frontend dependencies installed"
    else
        print_warning "Frontend directory not found, skipping frontend setup"
    fi
    
    # Install backend dependencies
    if [ -d "backend" ] && [ -f "backend/package.json" ]; then
        print_status "Installing backend dependencies..."
        cd backend
        npm install
        cd ..
        print_success "Backend dependencies installed"
    else
        print_warning "Backend directory not found, skipping backend setup"
    fi
}

# Function to run initial setup
run_initial_setup() {
    print_status "Running initial project setup..."
    
    # Create necessary directories
    mkdir -p logs tmp
    
    # Set proper permissions for scripts
    if [ -d "scripts" ]; then
        chmod +x scripts/*.sh 2>/dev/null || true
    fi
    
    print_success "Initial setup completed"
}

# Function to display next steps
display_next_steps() {
    echo ""
    print_success "Setup completed! Here are the next steps:"
    echo ""
    echo "1. Update your .env file with actual configuration values"
    echo "2. Start the database (if using Docker):"
    echo "   docker-compose up -d db"
    echo ""
    echo "3. When frontend code is available:"
    echo "   cd frontend && npm run dev"
    echo ""
    echo "4. When backend code is available:"
    echo "   cd backend && npm run start:dev"
    echo ""
    echo "5. View the application:"
    echo "   Frontend: http://localhost:3001"
    echo "   Backend API: http://localhost:3000"
    echo "   API Documentation: http://localhost:3000/api/docs"
    echo ""
    echo "For more information, see:"
    echo "- README.md for project overview"
    echo "- CONTRIBUTING.md for development guidelines"
    echo "- ARCHITECTURE.md for technical details"
}

# Main setup function
main() {
    echo ""
    print_status "ProfilePays Development Setup"
    echo "==============================="
    echo ""
    
    # Check and install Node.js
    if ! check_node_version; then
        read -p "Would you like to install Node.js 20? (y/n): " -n 1 -r
        echo ""
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            install_node
        else
            print_warning "Skipping Node.js installation"
        fi
    fi
    
    # Setup environment file
    setup_env_file
    
    # Check Docker
    setup_docker
    
    # Check PostgreSQL
    setup_postgresql
    
    # Install dependencies
    install_dependencies
    
    # Setup Git hooks
    setup_git_hooks
    
    # Run initial setup
    run_initial_setup
    
    # Display next steps
    display_next_steps
}

# Run main function
main "$@"