# SimpleAI

A modern AI chat application built with Next.js and Mor.Rest integration.

## Quick Start Guide

SimpleAI is a complete integration of Mor.Rest in a Next.js application, providing a powerful and easy-to-use chat interface.

### Prerequisites

- Node.js (Latest LTS version recommended)
- pnpm (recommended package manager)

### Installation

1. **Install pnpm** (if not already installed):

```bash
# Using npm
npm install -g pnpm

# Using curl (for Unix-based systems)
curl -fsSL https://get.pnpm.io/install.sh | sh -

# Using PowerShell (for Windows)
iwr https://get.pnpm.io/install.ps1 -useb | iex
```

2. **Clone the Repository**:

```bash
git clone https://github.com/joeyzengazi/SimpleAI.git
cd SimpleAI
```

3. **Install Dependencies**:

```bash
pnpm install
```

4. **Environment Setup**:

Create a `.env` file in the root directory with your API keys and configuration. See `.env.example` for required variables.

5. **Start Development Server**:

```bash
pnpm dev
```

The application will be available at `http://localhost:3000`.

## Building for Production

To build the site for production:

```bash
pnpm build
```

To start the production server:

```bash
pnpm start
```

## Features

- Real-time chat interface
- Mor.Rest API integration
- Streaming responses
- Error handling
- Modern UI with Tailwind CSS
- TypeScript support

## Project Structure

```
SimpleAI/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   └── (preview)/         # Preview components
├── components/            # React components
├── public/               # Static assets
└── ...config files       # Configuration files
```

## Adding Chat Functionality

The project includes a complete implementation of chat functionality using Mor.Rest. Key features include:

- API route handler for chat completions
- Streaming implementation for real-time responses
- Error handling and environment variable setup

## Next Steps

1. Configure your chat interface
2. Learn about message handling
3. Explore error handling
4. Customize the UI to match your needs

## Support

Need help? We're here for you:

- [API Reference](https://mor.rest/docs)
- [GitHub Repository](https://github.com/joeyzengazi/SimpleAI)
- [Community Support](https://mor.rest/community)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

