# 🎙️ Podcast Brain

An AI-powered podcast management application that lets you upload podcasts, automatically transcribe them, and chat with your content using RAG (Retrieval-Augmented Generation).

![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)
![Supabase](https://img.shields.io/badge/Supabase-Database-green?style=flat-square&logo=supabase)
![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4-orange?style=flat-square&logo=openai)

## ✨ Features

- 🎵 **Podcast Upload** - Upload audio files up to 100MB (MP3, WAV, M4A, OGG, WebM)
- 🎯 **AI Transcription** - Automatic transcription powered by AssemblyAI
- 🧠 **Smart Chat** - Ask questions about your podcasts using RAG with semantic search
- 📚 **Library Management** - Browse, search, and manage your podcast collection
- 📊 **Dashboard** - View statistics and insights about your podcasts
- 🔐 **Authentication** - Secure user authentication with Supabase Auth
- 📱 **Responsive Design** - Fully responsive with touch-friendly 44px targets
- 🌙 **Modern UI** - Clean interface with loading states, toasts, and error handling

## 🛠️ Tech Stack

| Category | Technology |
|----------|------------|
| **Framework** | [Next.js 14](https://nextjs.org) (App Router) |
| **Language** | [TypeScript](https://www.typescriptlang.org) |
| **Styling** | [Tailwind CSS](https://tailwindcss.com) |
| **Database** | [Supabase](https://supabase.com) (PostgreSQL + pgvector) |
| **Auth** | [Supabase Auth](https://supabase.com/auth) |
| **Storage** | [Supabase Storage](https://supabase.com/storage) |
| **Transcription** | [AssemblyAI](https://www.assemblyai.com) |
| **AI/Embeddings** | [OpenAI](https://openai.com) (text-embedding-3-small, gpt-4o-mini) |
| **UI Components** | [Radix UI](https://www.radix-ui.com) + custom components |
| **Icons** | [Lucide React](https://lucide.dev) |
| **Forms** | [React Hook Form](https://react-hook-form.com) + [Zod](https://zod.dev) |
| **State** | [Zustand](https://zustand-demo.pmnd.rs) |
| **Toasts** | [Sonner](https://sonner.emilkowal.ski) |

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org) 18.17 or later
- [npm](https://www.npmjs.com), [yarn](https://yarnpkg.com), or [pnpm](https://pnpm.io)
- [Supabase](https://supabase.com) account (free tier works)
- [OpenAI](https://platform.openai.com) API key
- [AssemblyAI](https://www.assemblyai.com) API key

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/podcast-brain.git
   cd podcast-brain
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```

3. **Set up environment variables**
   
   Copy the example environment file:
   ```bash
   cp .env.example .env.local
   ```
   
   Fill in your credentials (see [Environment Variables](#environment-variables) below)

4. **Set up the database**
   
   Follow the instructions in [SETUP.md](./SETUP.md) to configure Supabase

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Open the app**
   
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🔑 Environment Variables

Create a `.env.local` file in the root directory with the following variables:

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | ✅ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous/public key | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-side only) | ✅ |
| `OPENAI_API_KEY` | OpenAI API key for embeddings and chat | ✅ |
| `ASSEMBLYAI_API_KEY` | AssemblyAI API key for transcription | ✅ |
| `NEXT_PUBLIC_APP_URL` | Your app URL (e.g., http://localhost:3000) | ✅ |

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# OpenAI
OPENAI_API_KEY=sk-your-openai-key

# AssemblyAI
ASSEMBLYAI_API_KEY=your-assemblyai-key

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 🗄️ Database Setup

The application requires the following database tables and extensions. See [SETUP.md](./SETUP.md) for detailed setup instructions.

### Required Extensions
- `vector` (pgvector) - For semantic similarity search

### Tables
- `users` - User profiles linked to Supabase Auth
- `podcasts` - Podcast metadata and transcription status
- `podcast_chunks` - Transcription chunks with vector embeddings
- `chat_messages` - Chat history for RAG conversations

## 📁 Project Structure

```
podcast-brain/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── (auth)/            # Auth pages (login, signup)
│   │   ├── (dashboard)/       # Protected dashboard pages
│   │   ├── api/               # API routes
│   │   └── layout.tsx         # Root layout with providers
│   ├── components/            # React components
│   │   ├── auth/              # Authentication components
│   │   ├── chat/              # Chat interface components
│   │   ├── dashboard/         # Dashboard components
│   │   ├── layout/            # Layout components (header, sidebar)
│   │   ├── library/           # Library/podcast list components
│   │   ├── providers/         # Context providers
│   │   ├── ui/                # Reusable UI components
│   │   └── upload/            # Upload components
│   ├── hooks/                 # Custom React hooks
│   ├── lib/                   # Utility functions and configs
│   │   ├── supabase/          # Supabase client configurations
│   │   └── validations/       # Zod schemas
│   ├── stores/                # Zustand stores
│   └── types/                 # TypeScript type definitions
├── public/                    # Static assets
├── .env.local                 # Environment variables (not committed)
└── package.json
```

## 💻 Development

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run type-check` | Run TypeScript compiler check |

### Key Development Patterns

- **Server Components** - Used by default for optimal performance
- **Client Components** - Used when interactivity is needed (marked with `'use client'`)
- **API Routes** - RESTful endpoints in `src/app/api/`
- **Route Groups** - `(auth)` for public auth pages, `(dashboard)` for protected pages
- **Middleware** - Handles auth redirects and protected routes

## 🚢 Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import the project in [Vercel](https://vercel.com)
3. Add all environment variables in Vercel's project settings
4. Deploy!

### Other Platforms

The app can be deployed to any platform that supports Next.js:
- [Netlify](https://netlify.com)
- [Railway](https://railway.app)
- [AWS Amplify](https://aws.amazon.com/amplify/)
- [Docker](https://docker.com) (self-hosted)

## 📖 Documentation

- [SETUP.md](./SETUP.md) - Detailed setup instructions for Supabase, API keys, and deployment

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

Built with ❤️ using Next.js and AI
