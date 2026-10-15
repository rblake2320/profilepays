# ProfilePays

**Turn your profile into profit.**  

ProfilePays is a social-advertising platform concept that would pay users for temporarily swapping their profile pictures with brand-sponsored images while giving businesses self-service tooling to launch targeted campaigns.

> **Status**: The first static-placement lifecycle is implemented for a local AIHangout integration
> using test credits only. It includes consent, timed assignment, verification, restoration, and
> a balanced test-credit ledger. See the [local runbook and acceptance evidence](docs/STATIC-PILOT.md).
> The broader [workflow specification](docs/PROFILEPAYS-WORKFLOW-V1.md) remains the roadmap.

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
- Frontend and backend source under `frontend/` and `backend/`
- The [workflow specification and implementation mapping](docs/PROFILEPAYS-WORKFLOW-V1.md)
- 📋 Project documentation and planning
- 🔧 GitHub templates (issues, PRs)
- ⚙️ CI/CD workflow templates
- 📝 Contributing guidelines
- 📄 License and legal documents

## Development Setup

The source checkout has this structure. These commands are setup guidance, not a verified
end-to-end deployment receipt:

```bash
# Clone the repository
git clone https://github.com/rblake2320/profilepays.git
cd profilepays

# Frontend setup
cd frontend
npm install
npm run dev

# Backend setup
cd ../backend
npm install
cp .env.example .env
npm run start:dev

# Docker setup
docker compose up --build
```

## Testing Strategy

The intended testing approach includes:
* **Jest + SuperTest** for back-end unit / integration testing
* **React Testing Library + Jest** for front-end components
* **Cypress** for end-to-end testing
* **GitHub Actions** for automated testing

## Contributing

1. Fork / branch from `main`
2. `npm run lint && npm test` must pass
3. Open a pull request; PR template below will guide you.

## License

MIT – see [`LICENSE`](LICENSE)."
