# Contributing to ProfilePays

Thank you for your interest in contributing to ProfilePays! This document
provides guidelines and information for contributors.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [How to Contribute](#how-to-contribute)
- [Development Workflow](#development-workflow)
- [Code Style Guidelines](#code-style-guidelines)
- [Testing Requirements](#testing-requirements)
- [Pull Request Process](#pull-request-process)
- [Issue Reporting](#issue-reporting)

## Code of Conduct

By participating in this project, you agree to abide by our Code of Conduct:

- Be respectful and inclusive
- Welcome newcomers and help them learn
- Focus on constructive feedback
- Respect different viewpoints and experiences
- Show empathy towards other community members

## Getting Started

### Prerequisites

- Node.js (version 18.x or 20.x)
- npm or yarn package manager
- Git
- Docker (optional, for containerized development)

### Repository Structure

Currently, this repository contains project documentation and templates. When
development begins:

```
profilepays/
├── frontend/          # React frontend application
├── backend/           # NestJS backend API
├── docs/              # Additional documentation
├── .github/           # GitHub templates and workflows
├── docker/            # Docker configuration files
└── scripts/           # Build and deployment scripts
```

## How to Contribute

### Types of Contributions

- 🐛 **Bug Reports**: Help us identify and fix issues
- ✨ **Feature Requests**: Suggest new functionality
- 📖 **Documentation**: Improve or add documentation
- 🔧 **Code**: Implement features or fix bugs
- 🧪 **Testing**: Add or improve test coverage
- 🎨 **Design**: UI/UX improvements and suggestions

### Before You Start

1. Check existing [issues](https://github.com/rblake2320/profilepays/issues) to
   avoid duplicates
2. For large changes, open an issue first to discuss the approach
3. Fork the repository and create a feature branch
4. Ensure you understand the project's goals and architecture

## Development Workflow

### 1. Fork and Clone

```bash
# Fork the repository on GitHub, then clone your fork
git clone https://github.com/YOUR_USERNAME/profilepays.git
cd profilepays

# Add the original repository as upstream
git remote add upstream https://github.com/rblake2320/profilepays.git
```

### 2. Create a Branch

```bash
# Create a new branch for your feature/fix
git checkout -b feature/your-feature-name
# or
git checkout -b fix/issue-description
```

### 3. Make Changes

- Write clear, concise commit messages
- Keep commits focused and atomic
- Follow the established code style
- Add tests for new functionality
- Update documentation as needed

### 4. Test Your Changes

```bash
# Run tests (when implemented)
npm test

# Run linting
npm run lint

# Check formatting
npm run format:check
```

## Code Style Guidelines

### General Principles

- Write self-documenting code with clear variable and function names
- Keep functions small and focused on a single responsibility
- Use consistent indentation (2 spaces)
- Add comments for complex logic, not obvious code

### TypeScript/JavaScript

- Use TypeScript for all new code
- Prefer `const` over `let`, avoid `var`
- Use async/await over promises when possible
- Follow ESLint and Prettier configurations

### React Components

- Use functional components with hooks
- Implement proper prop validation with TypeScript
- Keep components small and reusable
- Use meaningful component and prop names

### API Development

- Follow RESTful conventions
- Use proper HTTP status codes
- Implement comprehensive error handling
- Document all endpoints with OpenAPI/Swagger

## Testing Requirements

### Frontend Testing

- Unit tests for utility functions and hooks
- Component tests using React Testing Library
- Integration tests for complex user flows
- E2E tests for critical user journeys

### Backend Testing

- Unit tests for services and utilities
- Integration tests for API endpoints
- Database tests using test databases
- Security tests for authentication and authorization

### Test Coverage

- Maintain minimum 80% code coverage
- Focus on testing business logic and critical paths
- Write tests that verify behavior, not implementation

## Pull Request Process

### Before Submitting

1. Ensure all tests pass locally
2. Run linting and fix any issues
3. Update documentation if needed
4. Rebase your branch on the latest main branch
5. Write a clear PR description

### PR Requirements

- [ ] Tests pass locally
- [ ] Code is linted and formatted
- [ ] Documentation updated (if applicable)
- [ ] Breaking changes documented
- [ ] Linked to relevant issue(s)

### PR Description Template

Use our [Pull Request Template](.github/PULL_REQUEST_TEMPLATE.md) and include:

- **Purpose**: What problem does this solve?
- **Approach**: How did you solve it?
- **Testing**: How can reviewers test this?
- **Screenshots**: For UI changes
- **Breaking Changes**: Any backwards incompatible changes

### Review Process

1. Automated checks must pass (CI/CD, tests, linting)
2. At least one code review approval required
3. Address all review feedback
4. Maintain clean commit history
5. Squash commits if requested

## Issue Reporting

### Bug Reports

Use our [Bug Report Template](.github/ISSUE_TEMPLATE/bug_report.md) and include:

- Clear description of the issue
- Steps to reproduce
- Expected vs actual behavior
- Environment details (OS, browser, version)
- Screenshots or error logs

### Feature Requests

Use our [Feature Request Template](.github/ISSUE_TEMPLATE/feature_request.md)
and include:

- Problem statement
- Proposed solution
- Alternative solutions considered
- Additional context or mockups

## Development Environment Setup

### Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/profilepays

# Authentication
JWT_SECRET=your-secret-key
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Payments
STRIPE_SECRET_KEY=your-stripe-secret-key
PAYPAL_CLIENT_ID=your-paypal-client-id
```

### Database Setup

```bash
# Start PostgreSQL with Docker
docker run --name profilepays-db -e POSTGRES_PASSWORD=password -p 5432:5432 -d postgres

# Run migrations (when implemented)
npm run migration:run
```

## Release Process

1. Version bumps follow [Semantic Versioning](https://semver.org/)
2. Changelog is updated for each release
3. Releases are tagged and include release notes
4. Docker images are built and published automatically

## Getting Help

- 📖 Check the [README](README.md) and documentation
- 💬 Open a [Discussion](https://github.com/rblake2320/profilepays/discussions)
  for questions
- 🐛 Create an [Issue](https://github.com/rblake2320/profilepays/issues) for
  bugs
- 📧 Contact maintainers directly for security issues

## Recognition

Contributors will be recognized in:

- README contributors section
- Release notes
- Annual contributor appreciation posts

Thank you for contributing to ProfilePays! 🚀
