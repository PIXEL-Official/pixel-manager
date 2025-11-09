# Pixel Manager Bot

Discord bot for managing voice channel tracking and statistics.

## Features

- 🎤 Voice channel tracking
- 📊 Weekly statistics and leaderboards
- ⚠️ Automatic kick system for inactive users
- 💬 Chat channel management
- 📈 User activity monitoring

## Tech Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Discord.js v14
- **Database**: Supabase (PostgreSQL)
- **Testing**: Vitest
- **Package Manager**: pnpm

## Prerequisites

- Node.js 18.x or higher
- pnpm 8.x or higher
- Supabase account and project

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd pixel-manager
```

2. Install dependencies:
```bash
pnpm install
```

3. Set up environment variables:
Create a `.env` file in the root directory:
```env
DISCORD_TOKEN=your_discord_bot_token
GUILD_ID=your_guild_id
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Set up the database:
Run the SQL scripts in `src/scripts/` in your Supabase SQL editor:
- `createTables.sql`
- `addVoiceChannelsTable.sql`
- `addChatChannelsTable.sql`
- `addLastMessageTime.sql`

## Development

### Run in development mode:
```bash
pnpm dev
```

### Build the project:
```bash
pnpm build
```

### Run in production:
```bash
pnpm start
```

### Watch mode for TypeScript:
```bash
pnpm watch
```

## Testing

This project uses Vitest for testing.

### Run tests:
```bash
# Run tests in watch mode
pnpm test

# Run tests once
pnpm test:run

# Run tests with UI
pnpm test:ui

# Run tests with coverage
pnpm test:coverage
```

### Test Structure

Tests are organized in `src/__tests__/` directory:

```
src/__tests__/
├── setup.ts                          # Test setup and configuration
├── commands/
│   └── ping.test.ts                 # Command tests
├── repositories/
│   ├── userRepository.test.ts       # User repository tests
│   ├── voiceChannelRepository.test.ts
│   ├── voiceSessionRepository.test.ts
│   └── chatChannelRepository.test.ts
├── services/
│   ├── voiceTracker.test.ts         # Voice tracking service tests
│   ├── kickChecker.test.ts          # Kick checker service tests
│   └── statsService.test.ts         # Statistics service tests
└── utils/
    ├── dateHelper.test.ts           # Date utility tests
    └── logger.test.ts               # Logger utility tests
```

### Writing Tests

Example test file:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { YourModule } from '../../path/to/module';

describe('YourModule', () => {
  beforeEach(() => {
    // Setup before each test
    vi.clearAllMocks();
  });

  it('should do something', () => {
    // Arrange
    const input = 'test';
    
    // Act
    const result = YourModule.doSomething(input);
    
    // Assert
    expect(result).toBe('expected');
  });
});
```

### Coverage Reports

After running `pnpm test:coverage`, open `coverage/index.html` in your browser to view detailed coverage reports.

## Project Structure

```
pixel-manager/
├── src/
│   ├── commands/          # Discord slash commands
│   ├── database/          # Database connection
│   ├── models/            # TypeScript types and interfaces
│   ├── repositories/      # Data access layer
│   ├── scripts/           # SQL scripts
│   ├── services/          # Business logic
│   ├── utils/            # Utility functions
│   └── index.ts          # Main bot entry point
├── vitest.config.ts      # Vitest configuration
├── tsconfig.json         # TypeScript configuration
└── package.json          # Dependencies and scripts
```

## Key Components

### Repositories
- **UserRepository**: User data management
- **VoiceChannelRepository**: Voice channel tracking
- **VoiceSessionRepository**: Voice session records
- **ChatChannelRepository**: Chat channel management

### Services
- **VoiceTracker**: Tracks user voice channel activity
- **KickChecker**: Monitors and kicks inactive users
- **StatsService**: Generates statistics and leaderboards

### Utils
- **dateHelper**: Date manipulation utilities
- **logger**: Structured logging
- **deployCommands**: Slash command deployment

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DISCORD_TOKEN` | Discord bot token | Yes |
| `GUILD_ID` | Discord server (guild) ID | Yes |
| `SUPABASE_URL` | Supabase project URL | Yes |
| `SUPABASE_ANON_KEY` | Supabase anonymous key | Yes |

## Contributing

1. Fork the repository
2. Create a feature branch
3. Write tests for your changes
4. Ensure all tests pass (`pnpm test:run`)
5. Submit a pull request

## License

ISC

## Support

For issues and questions, please open an issue on GitHub.
