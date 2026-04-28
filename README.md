# Chatbot Application

A comprehensive chatbot application with clean architecture and extensive UI interface, powered by Ollama for local AI model execution.

## Features

- **Clean Architecture**: Separation of concerns with modular design
- **Local AI Models**: Uses Ollama for free, open-source model execution
- **Modern UI**: React-based interface with TailwindCSS
- **Database**: SQLite for efficient data storage
- **REST API**: Express.js backend with comprehensive endpoints
- **Model Training**: Custom dataset training capabilities
- **Real-time Chat**: WebSocket-based communication

## Tech Stack

### Backend
- Node.js with Express.js
- SQLite for database
- Ollama for AI model integration
- JWT for authentication
- Helmet for security

### Frontend
- React 18
- TailwindCSS for styling
- Lucide icons
- Modern component architecture

### AI/ML
- Ollama (local model execution)
- Support for various open-source models (Llama, Qwen, Gemma, etc.)

## Getting Started

### Prerequisites
1. Install Node.js (v16 or higher)
2. Install Ollama from [ollama.com](https://ollama.com)
3. Pull a model: `ollama pull llama2` (or any preferred model)

### Installation

```bash
# Clone and setup
git clone <repository>
cd chatbot-application
npm run setup

# Start development servers
npm run dev
```

### Project Structure

```
chatbot-application/
├── server/                 # Backend application
│   ├── controllers/        # Route controllers
│   ├── models/            # Database models
│   ├── services/          # Business logic
│   ├── middleware/        # Express middleware
│   ├── routes/            # API routes
│   ├── config/            # Configuration files
│   └── utils/             # Utility functions
├── client/                # Frontend application
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── pages/         # Page components
│   │   ├── hooks/         # Custom hooks
│   │   ├── services/      # API services
│   │   ├── utils/         # Utility functions
│   │   └── styles/        # Global styles
│   └── public/            # Static assets
├── database/              # Database files and migrations
├── docs/                  # Documentation
└── tests/                 # Test files
```

## Available Models

Through Ollama, you can use various open-source models:
- Llama 2/3
- Qwen
- Gemma
- DeepSeek
- And many more...

## API Endpoints

- `POST /api/chat` - Send chat message
- `GET /api/models` - List available models
- `POST /api/train` - Train custom model
- `GET /api/conversations` - Get conversation history
- `POST /api/auth/login` - User authentication

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License
