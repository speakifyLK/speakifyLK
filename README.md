<a name="readme-top"></a>

# SpeakifyLK - Interactive platform for language learning.

[![GitHub license](https://flat.badgen.net/github/license/speakifyLK/speakifyLK?icon=github&color=black&scale=1.01)](https://github.com/speakifyLK/speakifyLK/blob/main/LICENSE "GitHub license")
[![Maintenance](https://flat.badgen.net/static/Maintained/yes?icon=github&color=black&scale=1.01)](https://github.com/speakifyLK/speakifyLK/commits/main "Maintenance")
[![GitHub branches](https://flat.badgen.net/github/branches/speakifyLK/speakifyLK?icon=github&color=black&scale=1.01)](https://github.com/speakifyLK/speakifyLK/branches "GitHub branches")
[![Github commits](https://flat.badgen.net/github/commits/speakifyLK/speakifyLK?icon=github&color=black&scale=1.01)](https://github.com/speakifyLK/speakifyLK/commits "Github commits")
[![GitHub issues](https://flat.badgen.net/github/issues/speakifyLK/speakifyLK?icon=github&color=black&scale=1.01)](https://github.com/speakifyLK/speakifyLK/issues "GitHub issues")
[![GitHub pull requests](https://flat.badgen.net/github/prs/speakifyLK/speakifyLK?icon=github&color=black&scale=1.01)](https://github.com/speakifyLK/speakifyLK/pulls "GitHub pull requests")

<!-- Table of Contents -->
<details>

<summary>

# :notebook_with_decorative_cover: Table of Contents

</summary>

- [Folder Structure](#bangbang-folder-structure)
- [Getting Started](#toolbox-getting-started)
- [Tech Stack](#gear-tech-stack)
- [Contribute](#raised_hands-contribute)
- [Acknowledgements](#gem-acknowledgements)
- [Learn More](#books-learn-more)
- [Deploy on Vercel](#page_with_curl-deploy-on-vercel)
- [Give A Star](#star-give-a-star)

</details>

## :bangbang: Folder Structure

Here is the folder structure of this app.

<!--- FOLDER_STRUCTURE_START --->
```bash
speakify/
  |- actions/
    |-- ai-quiz.test.ts
    |-- ai-quiz.ts
    |-- challenge-progress.test.ts
    |-- challenge-progress.ts
    |-- chat.test.ts
    |-- chat.ts
    |-- quiz.test.ts
    |-- quiz.ts
    |-- user-activity.test.ts
    |-- user-activity.ts
    |-- user-progress.test.ts
    |-- user-progress.ts
    |-- user-subscription.test.ts
    |-- user-subscription.ts
  |- app/
    |-- (auth)/
    |-- (main)/
    |-- (marketing)/
    |-- admin/
    |-- api/
    |-- lesson/
    |-- apple-icon.png
    |-- favicon.ico
    |-- globals.css
    |-- icon1.png
    |-- icon2.png
    |-- layout.test.tsx
    |-- layout.tsx
  |- components/
    |-- chat/
    |-- modals/
    |-- profile/
    |-- quiz/
    |-- ui/
    |-- feed-wrapper.test.tsx
    |-- feed-wrapper.tsx
    |-- loader.test.tsx
    |-- loader.tsx
    |-- mobile-header.test.tsx
    |-- mobile-header.tsx
    |-- mobile-sidebar.test.tsx
    |-- mobile-sidebar.tsx
    |-- promo.test.tsx
    |-- promo.tsx
    |-- quests.test.tsx
    |-- quests.tsx
    |-- sidebar-item.test.tsx
    |-- sidebar-item.tsx
    |-- sidebar-user-button.test.tsx
    |-- sidebar-user-button.tsx
    |-- sidebar.test.tsx
    |-- sidebar.tsx
    |-- sticky-wrapper.test.tsx
    |-- sticky-wrapper.tsx
    |-- user-progress.test.tsx
    |-- user-progress.tsx
  |- config/
    |-- index.test.ts
    |-- index.ts
    |-- labeler.yml
    |-- labels.yml
    |-- prettier.json
  |- db/
    |-- drizzle.test.ts
    |-- drizzle.ts
    |-- export-queries.test.ts
    |-- export-queries.ts
    |-- queries.test.ts
    |-- queries.ts
    |-- schema.test.ts
    |-- schema.ts
  |- drizzle/
    |-- meta/
    |-- 0000_right_true_believers.sql
  |- infrastructure/
    |-- modules/
    |-- .terraform.lock.hcl
    |-- main.tf
    |-- outputs.tf
    |-- terraform.tfvars.example
    |-- variables.tf
  |- lib/
    |-- adaptive-difficulty.test.ts
    |-- adaptive-difficulty.ts
    |-- admin.test.ts
    |-- admin.ts
    |-- chat-prompt.test.ts
    |-- chat-prompt.ts
    |-- content-formatter.test.ts
    |-- content-formatter.ts
    |-- gcp-auth.test.ts
    |-- gcp-auth.ts
    |-- gemini.test.ts
    |-- gemini.ts
    |-- quiz-normalise.test.ts
    |-- quiz-normalise.ts
    |-- quiz-prompt.test.ts
    |-- quiz-prompt.ts
    |-- quiz-rag.test.ts
    |-- quiz-rag.ts
    |-- rag-import-status.test.ts
    |-- rag-import-status.ts
    |-- rag-quiz-e2e-helpers.test.ts
    |-- rag-quiz-e2e-helpers.ts
    |-- rate-limit.test.ts
    |-- rate-limit.ts
    |-- stripe.test.ts
    |-- stripe.ts
    |-- utils.test.ts
    |-- utils.ts
    |-- vertex-rag.test.ts
    |-- vertex-rag.ts
  |- public/
  |- scripts/
    |-- create-rag-corpus.test.ts
    |-- create-rag-corpus.ts
    |-- export-course-content.test.ts
    |-- export-course-content.ts
    |-- import-rag-files.test.ts
    |-- import-rag-files.ts
    |-- prod.test.ts
    |-- prod.ts
    |-- rag-status.test.ts
    |-- rag-status.ts
    |-- test-content-formatter-integration.test.ts
    |-- test-content-formatter-integration.ts
    |-- test-content-formatter.test.ts
    |-- test-content-formatter.ts
    |-- test-export-queries.test.ts
    |-- test-export-queries.ts
    |-- test-gcp-auth.test.ts
    |-- test-gcp-auth.ts
    |-- test-gemini.test.ts
    |-- test-gemini.ts
    |-- test-rag-quiz.test.ts
    |-- test-rag-quiz.ts
    |-- test-rag.ts
  |- store/
    |-- quiz-store.test.ts
    |-- quiz-store.ts
    |-- use-exit-modal.test.ts
    |-- use-exit-modal.ts
    |-- use-hearts-modal.test.ts
    |-- use-hearts-modal.ts
    |-- use-practice-modal.test.ts
    |-- use-practice-modal.ts
  |- tests/
    |-- helpers/
    |-- api-validation.spec.ts
    |-- auth-redirect.spec.ts
    |-- error-handling.spec.ts
    |-- landing-page.spec.ts
    |-- navigation.spec.ts
    |-- quiz-generate-api.spec.ts
    |-- quiz-rag-e2e.spec.ts
    |-- rag-chat-e2e.spec.ts
    |-- rag-import-status.spec.ts
    |-- seo-metadata.spec.ts
    |-- sign-in-page.spec.ts
    |-- sign-up-page.spec.ts
    |-- static-assets.spec.ts
  |- .env.example
  |- .env/.env.local
  |- .gitignore
  |- .gitmessage
  |- .prettierrc.json
  |- bun.lock
  |- components.json
  |- constants.test.ts
  |- constants.ts
  |- custom-modules.d.ts
  |- drizzle.config.ts
  |- environment.d.ts
  |- eslint.config.mjs
  |- middleware.test.ts
  |- middleware.ts
  |- next.config.ts
  |- package-lock.json
  |- package.json
  |- playwright.config.ts
  |- postcss.config.js
  |- tailwind.config.ts
  |- test_output.txt
  |- tsconfig.json
  |- vercel.ts
  |- vitest.config.ts
  |- vitest.setup.ts
```
<!--- FOLDER_STRUCTURE_END --->

<br />

## :toolbox: Getting Started

1. Make sure **Git** and **NodeJS** is installed.
2. Clone this repository to your local computer.
3. Create `.env` file in **root** directory.
4. Contents of `.env`:

```env
# .env

# disabled next.js telemetry
NEXT_TELEMETRY_DISABLED=1

# clerk auth keys
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
CLERK_SECRET_KEY=sk_test_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

# clerk redirect urls
NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"
NEXT_PUBLIC_CLERK_SIGN_UP_URL="/sign-up"
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL="/"
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL="/"

# neon db uri
DATABASE_URL="postgresql://<user>:<password>@<host>:<port>/Speakify?sslmode=require"

# stripe api key and webhook
STRIPE_API_SECRET_KEY=sk_test_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
STRIPE_WEBHOOK_SECRET=whsec_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

# public app url
NEXT_PUBLIC_APP_URL=http://localhost:3000

# clerk admin user id(s) separated by comma and space (, )
CLERK_ADMIN_IDS="user_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
# or CLERK_ADMIN_IDS="user_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx, user_xxxxxxxxxxxxxxxxxxxxxx" for multiple admins.

# gemini ai api key — used as fallback if GOOGLE_SERVICE_ACCOUNT_KEY is not set
GEMINI_API_KEY=XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

# gemini model id (gemini-3.1-pro-preview / gemini-3.1-flash-lite-preview)
GEMINI_MODEL=gemini-3.1-pro-flash-lite-preview

# set to '1' to disable safety filters (BLOCK_NONE) — optional
# GEMINI_UNSAFE_MODE=1

# google cloud platform (GCP)
GCP_PROJECT_ID=your-gcp-project-id
GCP_LOCATION=us-west1
GOOGLE_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"...","private_key_id":"...","private_key":"...","client_email":"...","client_id":"...","auth_uri":"...","token_uri":"...","auth_provider_x509_cert_url":"...","client_x509_cert_url":"..."}'

# vertex ai rag corpus (resource: projects/.../ragCorpora/{RAG_CORPUS_ID})
RAG_CORPUS_ID=your-rag-corpus-id
# optional — defaults: speakifylk-rag-content, rag-content/
# RAG_CONTENT_BUCKET=speakifylk-rag-content
# RAG_GCS_PREFIX=rag-content/
```

5. Obtain Clerk Authentication Keys
   1. **Source**: Clerk Dashboard or Settings Page
   2. **Procedure**:
      - Log in to your Clerk account.
      - Navigate to the dashboard or settings page.
      - Look for the section related to authentication keys.
      - Copy the `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` provided in that section.

6. Retrieve Neon Database URI
   1. **Source**: Database Provider (e.g., Neon, PostgreSQL)
   2. **Procedure**:
      - Access your database provider's platform or configuration.
      - Locate the database connection details.
      - Replace `<user>`, `<password>`, `<host>`, and `<port>` placeholders in the URI with your actual database credentials.
      - Ensure to include `?sslmode=require` at the end of the URI for SSL mode requirement.

7. Fetch Stripe API Key and Webhook Secret
   1. **Source**: Stripe Dashboard
   2. **Procedure**:
      - Log in to your Stripe account.
      - Navigate to the dashboard or API settings.
      - Find the section related to API keys and webhook secrets.
      - Copy the `STRIPE_API_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`.

8. Specify Public App URL
   1. **Procedure**:
      - Replace `http://localhost:3000` with the URL of your deployed application.

9. Configure Google Cloud Platform (GCP)
   1. **Source**: Google Cloud Console
   2. **Procedure**:
      - Go to the Google Cloud Console and select or create a project.
      - Set `GCP_PROJECT_ID` to your project ID and `GCP_LOCATION` to your preferred region (e.g., `us-west1`).
      - Enable the **Vertex AI API** and **Generative Language API** for your project.
      - Navigate to **IAM & Admin > Service Accounts**, create a service account with `Vertex AI User` and `Storage Object Admin` roles, and generate a JSON key.
      - Copy the entire JSON key content into `GOOGLE_SERVICE_ACCOUNT_KEY` (wrap it in single quotes).
      - Create (or locate) a Vertex AI RAG corpus, then set `RAG_CORPUS_ID` to the last segment of the corpus resource name: `projects/{project}/locations/{location}/ragCorpora/{RAG_CORPUS_ID}`.
      - `GEMINI_API_KEY` is only needed as a fallback if `GOOGLE_SERVICE_ACCOUNT_KEY` is not set.

10. Identify Clerk Admin User IDs
11. **Source**: Clerk Dashboard or Settings Page
12. **Procedure**:
    - Log in to your Clerk account.
    - Navigate to the dashboard or settings page.
    - Find the section related to admin user IDs.
    - Copy the user IDs provided, ensuring they are separated by commas and spaces.

13. Save and Secure:
    - Save the changes to the `.env` file.

14. Install Project Dependencies using `bun install --legacy-peer-deps`.

15. Run the Seed Script:

In the same terminal, run the following command to execute the seed script:

```bash
bun run db:push && bun run db:prod
```

This command uses `bun` to execute the Typescript file (`scripts/prod.ts`) and writes challenges data in database.

14. Verify Data in Database:

Once the script completes, check your database to ensure that the challenges data has been successfully seeded.

15. Now app is fully configured 👍 and you can start using this app using either one of `bun dev`.

**NOTE:** Please make sure to keep your API keys and configuration values secure and do not expose them publicly.

## :cloud: Infrastructure (Terraform)

The `infrastructure/` directory contains Terraform configuration for provisioning GCP resources.

### Prerequisites

- [Terraform](https://developer.hashicorp.com/terraform/downloads) >= 1.5.0
- A GCP project with billing enabled
- Authenticated via `gcloud auth application-default login` or a service account key

### Setup

```bash
cd infrastructure
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your actual GCP project ID and region
terraform init
terraform plan
terraform apply
```

This will provision the following GCP resources:

- **APIs**: `aiplatform.googleapis.com` (Vertex AI), `generativelanguage.googleapis.com` (Generative Language), `storage.googleapis.com` (Cloud Storage), `iam.googleapis.com` (IAM)
- **Service Account**: `speakifylk-rag-sa` with Vertex AI and Storage permissions
- **GCS Bucket**: `speakifylk-rag-content` for RAG content storage (90-day lifecycle policy)

## :gear: Tech Stack

[![React JS](https://skillicons.dev/icons?i=react "React JS")](https://react.dev/ "React JS") [![Next JS](https://skillicons.dev/icons?i=next "Next JS")](https://nextjs.org/ "Next JS") [![Typescript](https://skillicons.dev/icons?i=ts "Typescript")](https://www.typescriptlang.org/ "Typescript") [![Tailwind CSS](https://skillicons.dev/icons?i=tailwind "Tailwind CSS")](https://tailwindcss.com/ "Tailwind CSS") [![Bun](https://skillicons.dev/icons?i=bun "Bun")](https://bun.sh/ "Bun") [![GCP](https://skillicons.dev/icons?i=gcp "Gemini")](https://ai.google.dev/ "Gemini") [![Vercel](https://skillicons.dev/icons?i=vercel "Vercel")](https://vercel.app/ "Vercel") [![Postgresql](https://skillicons.dev/icons?i=postgres "Postgresql")](https://www.postgresql.org/ "Postgresql")

## :raised_hands: Contribute

You might encounter some bugs while using this app. You are more than welcome to contribute. Just submit changes via pull request and I will review them before merging. Make sure you follow community guidelines.

## :gem: Acknowledgements

Useful resources and dependencies that are used in SpeakifyLK.

<!--- DEPENDENCIES_START --->
- [@clerk/nextjs](https://www.npmjs.com/package/@clerk/nextjs): ^6.12.12
- [@google-cloud/storage](https://www.npmjs.com/package/@google-cloud/storage): ^7.19.0
- [@google/genai](https://www.npmjs.com/package/@google/genai): ^1.46.0
- [@neondatabase/serverless](https://www.npmjs.com/package/@neondatabase/serverless): ^1.0.2
- [@next/eslint-plugin-next](https://www.npmjs.com/package/@next/eslint-plugin-next): ^16.2.0
- [@playwright/test](https://www.npmjs.com/package/@playwright/test): ^1.58.2
- [@radix-ui/react-avatar](https://www.npmjs.com/package/@radix-ui/react-avatar): ^1.1.11
- [@radix-ui/react-dialog](https://www.npmjs.com/package/@radix-ui/react-dialog): ^1.1.15
- [@radix-ui/react-progress](https://www.npmjs.com/package/@radix-ui/react-progress): ^1.1.8
- [@radix-ui/react-scroll-area](https://www.npmjs.com/package/@radix-ui/react-scroll-area): ^1.2.10
- [@radix-ui/react-separator](https://www.npmjs.com/package/@radix-ui/react-separator): ^1.1.8
- [@radix-ui/react-slot](https://www.npmjs.com/package/@radix-ui/react-slot): ^1.2.4
- [@tanstack/react-query](https://www.npmjs.com/package/@tanstack/react-query): ^5.95.2
- [@testing-library/jest-dom](https://www.npmjs.com/package/@testing-library/jest-dom): ^6.9.1
- [@testing-library/react](https://www.npmjs.com/package/@testing-library/react): ^16.3.2
- [@testing-library/user-event](https://www.npmjs.com/package/@testing-library/user-event): ^14.6.1
- [@types/node](https://www.npmjs.com/package/@types/node): ^25.5.0
- [@types/react](https://www.npmjs.com/package/@types/react): ^19.2.14
- [@types/react-dom](https://www.npmjs.com/package/@types/react-dom): ^19.2.3
- [@vercel/analytics](https://www.npmjs.com/package/@vercel/analytics): ^2.0.1
- [@vercel/config](https://www.npmjs.com/package/@vercel/config): ^0.0.41
- [@vercel/speed-insights](https://www.npmjs.com/package/@vercel/speed-insights): ^2.0.0
- [@vitejs/plugin-react](https://www.npmjs.com/package/@vitejs/plugin-react): ^6.0.1
- [@vitest/coverage-v8](https://www.npmjs.com/package/@vitest/coverage-v8): 4.1.2
- [allure-commandline](https://www.npmjs.com/package/allure-commandline): ^2.38.1
- [allure-playwright](https://www.npmjs.com/package/allure-playwright): ^3.6.0
- [allure-vitest](https://www.npmjs.com/package/allure-vitest): ^3.6.0
- [autoprefixer](https://www.npmjs.com/package/autoprefixer): ^10.4.27
- [class-variance-authority](https://www.npmjs.com/package/class-variance-authority): ^0.7.1
- [clsx](https://www.npmjs.com/package/clsx): ^2.1.0
- [dotenv](https://www.npmjs.com/package/dotenv): ^17.3.1
- [drizzle-kit](https://www.npmjs.com/package/drizzle-kit): ^0.31.10
- [drizzle-orm](https://www.npmjs.com/package/drizzle-orm): ^0.45.2
- [eslint](https://www.npmjs.com/package/eslint): ^9
- [eslint-config-prettier](https://www.npmjs.com/package/eslint-config-prettier): ^10.1.8
- [eslint-plugin-react-hooks](https://www.npmjs.com/package/eslint-plugin-react-hooks): ^7.0.1
- [google-auth-library](https://www.npmjs.com/package/google-auth-library): ^10.6.2
- [jsdom](https://www.npmjs.com/package/jsdom): ^29.0.1
- [lucide-react](https://www.npmjs.com/package/lucide-react): ^0.577.0
- [next](https://www.npmjs.com/package/next): ^16.2.1
- [p-limit](https://www.npmjs.com/package/p-limit): ^7.3.0
- [pg](https://www.npmjs.com/package/pg): ^8.20.0
- [postcss](https://www.npmjs.com/package/postcss): ^8
- [prettier](https://www.npmjs.com/package/prettier): ^3.8.1
- [prettier-plugin-tailwindcss](https://www.npmjs.com/package/prettier-plugin-tailwindcss): ^0.7.2
- [ra-data-simple-rest](https://www.npmjs.com/package/ra-data-simple-rest): ^5.14.4
- [react](https://www.npmjs.com/package/react): ^19.2.4
- [react-admin](https://www.npmjs.com/package/react-admin): ^5.14.4
- [react-circular-progressbar](https://www.npmjs.com/package/react-circular-progressbar): ^2.2.0
- [react-confetti](https://www.npmjs.com/package/react-confetti): ^6.4.0
- [react-dom](https://www.npmjs.com/package/react-dom): ^19.2.4
- [react-use](https://www.npmjs.com/package/react-use): ^17.6.0
- [sonner](https://www.npmjs.com/package/sonner): ^2.0.7
- [stripe](https://www.npmjs.com/package/stripe): ^20.4.1
- [tailwind-merge](https://www.npmjs.com/package/tailwind-merge): ^3.5.0
- [tailwindcss](https://www.npmjs.com/package/tailwindcss): ^3.4.19
- [tailwindcss-animate](https://www.npmjs.com/package/tailwindcss-animate): ^1.0.7
- [tsx](https://www.npmjs.com/package/tsx): ^4.21.0
- [typescript](https://www.npmjs.com/package/typescript): ^5
- [typescript-eslint](https://www.npmjs.com/package/typescript-eslint): ^8.57.1
- [vitest](https://www.npmjs.com/package/vitest): ^4.1.2
- [zustand](https://www.npmjs.com/package/zustand): ^5.0.12

<!--- DEPENDENCIES_END --->

## :books: Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js/) - your feedback and contributions are welcome!

## :page_with_curl: Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out [Next.js deployment documentation](https://nextjs.org/docs/deployment) for more details.

## :star: Give A Star

You can also give this repository a star to show more people and they can use this repository.

<br />
<p align="right">(<a href="#readme-top">back to top</a>)</p>
