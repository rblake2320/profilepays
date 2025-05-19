# ProfilePays

**Turn your profile into profit.**  
ProfilePays is a social-advertising platform that pays users for temporarily swapping their profile pictures with brand-sponsored images while giving businesses self-service tooling to launch targeted campaigns.

## Tech Stack
| Layer        | Choices used in this repo | Rationale |
|--------------|---------------------------|-----------|
| Front-end    | React + Redux Toolkit, Material-UI, Axios, React Router, React Hook Form | Component-based UI and strong ecosystem |
| Back-end     | NestJS (TypeScript), TypeORM, PostgreSQL | Modular architecture & typed safety |
| Auth         | JWT + OAuth2 (social log-ins) | Stateless, scalable |
| Payments     | Stripe (subscriptions) & PayPal/Payoneer (payouts) | Covers both sides of the marketplace |
| CI/CD        | GitHub Actions (build, test, Docker) | Automated quality gates |
| Container    | Docker (+ optional K8s) | Consistent deployment |

## Features
* Multi-step user & business onboarding  
* Campaign marketplace with earnings tracking  
* Tier-based subscription & reward system  
* Real-time analytics dashboards  
* REST API documented with Swagger / OpenAPI  
* Secure profile-picture swap verification  

## Local Setup

```bash
# clone & install root dependencies
git clone https://github.com/<your-org>/profilepays.git
cd profilepays
npm install   # tooling, husky etc.

# Front-end
cd frontend
npm install
npm run dev

# Back-end
cd ../backend
npm install
cp .env.example .env
npm run start:dev         # NestJS watch mode
npm run test              # Jest unit + integration tests

# Docker (optional all-in-one)
docker compose up --build
```

## Tests

* **Jest + SuperTest** for back-end unit / integration
* **React-Testing-Library + Jest** for front-end components

## Contributing

1. Fork / branch from `main`
2. `npm run lint && npm test` must pass
3. Open a pull request; PR template below will guide you.

## License

MIT – see [`LICENSE`](LICENSE)."
