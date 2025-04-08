---
title: "SimpleAI Installation"
description: "Quick start guide for using the Mor.Rest documentation site"
---

# SimpleAI Installation

This guide will help you quickly get started with the Mor.Rest documentation site.

## Quick Start

The easiest way to get started is to use our sample project, SimpleAI. This project demonstrates a complete integration of Mor.Rest in a Next.js application.

pnpm is the recommended package manager for SimpleAI installation.

To install pnpm:

```bash
# Using npm
npm install -g pnpm

# Using curl (for Unix-based systems)
curl -fsSL https://get.pnpm.io/install.sh | sh -

# Using PowerShell (for Windows)
iwr https://get.pnpm.io/install.ps1 -useb | iex
```

If you prefer to use npm instead of pnpm, you can replace `pnpm` commands with `npm` however you may face issues with production build.

### 2. Clone the Repository

```bash
git clone https://github.com/joeyzengazi/SimpleAI.git
cd SimpleAI
```

### 3. Install Dependencies

```bash
pnpm install
```

### 4. Set Up Your API Key

1. Rename the `.env.example` file to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Open the `.env` file and replace the placeholder API key with your Mor.Rest API key:
   ```
   MOR_REST_API_KEY=your_api_key_here
   ```

   You can obtain an API key from the [Mor.Rest website](https://mor.rest).

### 5. Start the Development Server

```bash
pnpm dev
```

The site will be available at `http://localhost:3000`. No additional configuration is needed.

## Building for Production

To build the site for production:

```bash
pnpm build
```

To start the production server:

```bash
pnpm start
```

## Adding Chat Functionality

If you want to add chat functionality to your own project, you can use the code from the [Mor.Rest API Integration](/docs/mor-rest-integration) guide. This guide provides:

- API route handler for chat completions
- Streaming implementation for real-time responses
- Error handling and environment variable setup

## Project Structure

```
simple-ai/
├── app/
│   ├── (preview)/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── globals.css
│   ├── api/
│   │   └── chat/
│   │       └── route.ts
│   └── favicon.ico
├── components/
│   ├── icons.tsx
│   └── markdown.tsx
├── public/
├── .env
├── .env.example
├── .eslintrc.json
├── .gitignore
├── LICENSE
├── README.md
├── next.config.mjs
├── package.json
├── postcss.config.mjs
├── tailwind.config.ts
└── tsconfig.json
```

## Next Steps

- [Configure your chat interface](/docs/basic-setup/setup)
- [Explore streaming features](/docs/features/streaming)

## Support

Need help? We're here for you:

- [API Reference](https://mor.rest/api-reference)

## License

This project is licensed under the MIT License - see the LICENSE file for details. 