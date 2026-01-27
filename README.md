# Socx Full-Stack Application

A complete full-stack application with professional Node.js backend, React frontend, and secure authentication system.

## 🏗️ Architecture Overview

### Backend (Node.js + Express + MySQL)
- **Framework**: Express.js dengan middleware security
- **Database**: MySQL dengan connection pooling
- **Authentication**: JWT dengan access & refresh tokens
- **Security**: Helmet, CORS, rate limiting, input validation

### Frontend (React + Tailwind CSS)
- **Framework**: React 18 dengan modern hooks
- **Styling**: Tailwind CSS untuk responsive design
- **Routing**: React Router untuk client-side navigation
- **State Management**: Context API untuk authentication

## 🚀 Quick Start

### Prerequisites
- Node.js v16 atau higher
- MySQL v8.0 atau higher
- npm atau yarn

### 1. Clone & Setup
```bash
# Install all dependencies (backend + frontend)
npm run setup
```

### 2. Environment Configuration
```bash
# Copy environment template
cp env.example .env

# Edit .env dengan database credentials Anda
# JWT secrets sudah tersedia di file .env
```

### 3. Database Setup
```bash
# Create MySQL database
# mysql -u root -p
# CREATE DATABASE socx_database;

# Run migrations
npm run migrate

# Seed admin user
npm run seed
```

### 4. Start Application
```bash
# Start both backend & frontend
npm run dev:full
```

**Aplikasi akan berjalan di:**
- **Backend API**: http://localhost:3000
- **Frontend**: http://localhost:9899

## 📋 Default Admin Credentials

```
Username: admin
Password: Admin123!
Email: admin@socx.com
```

## 📁 Project Structure

```
socx-otomatic-update/
├── src/                    # Backend source code
│   ├── config/            # Database & app configuration
│   ├── controllers/       # Route controllers
│   ├── middlewares/       # Authentication & security middleware
│   ├── models/           # Database models
│   ├── routes/           # API route definitions
│   ├── utils/            # Utility functions
│   ├── database/         # Migration & seeding scripts
│   └── server.js         # Express server entry point
├── frontend/              # React frontend application
│   ├── src/
│   │   ├── components/   # Reusable UI components
│   │   ├── contexts/     # React contexts (auth)
│   │   ├── pages/       # Page components
│   │   ├── utils/       # Frontend utilities
│   │   └── App.js       # Main React app
│   ├── public/          # Static assets
│   └── package.json     # Frontend dependencies
├── tests/                # Backend unit tests
├── env.example          # Environment template
├── package.json         # Backend dependencies & scripts
└── README.md           # This file
```

## Installation

### Prerequisites

- Node.js (v16 or higher)
- MySQL (v8.0 or higher)
- npm or yarn

### Setup Steps

1. **Clone and Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Configuration**
   ```bash
   cp .env.example .env
   ```

   Edit `.env` file with your configuration:
   ```env
   NODE_ENV=development
   PORT=3000

   # Database
   DB_HOST=localhost
   DB_USER=your_mysql_username
   DB_PASSWORD=your_mysql_password
   DB_NAME=socx_database
   DB_PORT=3306

   # JWT
   JWT_SECRET=your_super_secret_jwt_key_here
   JWT_EXPIRE=7d
   JWT_REFRESH_SECRET=your_super_secret_refresh_key_here
   JWT_REFRESH_EXPIRE=30d

   # Other settings...
   ```

3. **Database Setup**

   Create MySQL database:
   ```sql
   CREATE DATABASE socx_database;
   ```

   Run migrations:
   ```bash
   npm run migrate
   ```

   Run seeds (creates admin user):
   ```bash
   npm run seed
   ```

4. **Start Development Server**
   ```bash
   npm run dev
   ```

5. **Start Production Server**
   ```bash
   npm start
   ```

## 🔗 API Endpoints

### Authentication Routes
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/auth/register` | Register new user | ❌ |
| POST | `/api/auth/login` | User login | ❌ |
| POST | `/api/auth/refresh` | Refresh access token | ❌ |
| POST | `/api/auth/logout` | User logout | ✅ |
| GET | `/api/auth/profile` | Get user profile | ✅ |
| PUT | `/api/auth/profile` | Update user profile | ✅ |
| PUT | `/api/auth/password` | Change password | ✅ |

### System Routes
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/health` | Server health check | ❌ |

## 🛠️ Development Workflow

### Available Scripts

```bash
# Full application (backend + frontend)
npm run dev:full          # Start both servers concurrently

# Backend only
npm run dev               # Start backend with nodemon
npm run start             # Start backend in production mode
npm run migrate           # Run database migrations
npm run seed              # Seed database with initial data

# Frontend only
npm run frontend:dev      # Start frontend development server
npm run frontend:build    # Build frontend for production

# Setup & testing
npm run setup             # Install all dependencies
npm test                  # Run backend tests
```

### Development URLs
- **Frontend**: http://localhost:9899
- **Backend API**: http://localhost:3000
- **API Documentation**: http://localhost:3000/health

## API Usage Examples

### Register User
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "johndoe",
    "email": "john@example.com",
    "password": "SecurePass123!",
    "firstName": "John",
    "lastName": "Doe"
  }'
```

### Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "johndoe",
    "password": "SecurePass123!"
  }'
```

### Access Protected Route
```bash
curl -X GET http://localhost:3000/api/auth/profile \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## Security Features

- **Password Hashing**: bcrypt with configurable rounds
- **JWT Tokens**: Access and refresh token system
- **Rate Limiting**: Prevents brute force attacks
- **Input Validation**: Comprehensive validation with express-validator
- **CORS**: Configurable cross-origin resource sharing
- **Helmet**: Security headers
- **SQL Injection Protection**: Parameterized queries
- **XSS Protection**: Input sanitization

## Development

### Available Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm test` - Run tests
- `npm run migrate` - Run database migrations
- `npm run seed` - Run database seeds

### Code Quality

This project follows clean code principles:

- **Separation of Concerns**: Each module has a single responsibility
- **KISS Principle**: Simple and straightforward solutions
- **DRY Principle**: No code duplication
- **Modular Design**: Easy to maintain and extend
- **Error Handling**: Comprehensive error handling throughout
- **Documentation**: Well-documented code and API

### Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

## Deployment

### Environment Variables for Production

Make sure to set these environment variables in production:

```env
NODE_ENV=production
PORT=3000
DB_HOST=your_production_db_host
DB_USER=your_production_db_user
DB_PASSWORD=your_production_db_password
DB_NAME=your_production_db_name
JWT_SECRET=your_production_jwt_secret
JWT_REFRESH_SECRET=your_production_refresh_secret
```

### Docker Support

Add a `Dockerfile` and `docker-compose.yml` for containerized deployment:

```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new features
5. Ensure all tests pass
6. Submit a pull request

## License

ISC License

## 🔧 Troubleshooting

### Common Issues

#### Backend Connection Issues
```bash
# Check if backend is running
curl http://localhost:3000/health

# Check database connection
npm run migrate

# View backend logs
npm run dev  # Check console output
```

#### Frontend Issues
```bash
# Clear node_modules and reinstall
cd frontend
rm -rf node_modules package-lock.json
npm install

# Clear browser cache
# Hard refresh: Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)
```

#### Database Issues
```bash
# Reset database
# DROP DATABASE socx_database;
# CREATE DATABASE socx_database;

npm run migrate
npm run seed
```

#### Authentication Issues
```bash
# Clear stored tokens
# Open browser dev tools -> Application -> Local Storage
# Delete socx_bearer_token and socx_user

# Or run in browser console:
localStorage.removeItem('socx_bearer_token');
localStorage.removeItem('socx_user');
location.reload();
```

## 🚀 Deployment

### Production Build

1. **Build Frontend**
   ```bash
   npm run frontend:build
   ```

2. **Environment Setup**
   ```bash
   # Copy and edit production environment
   cp env.example .env.production
   # Update with production database and JWT secrets
   ```

3. **Database Setup**
   ```bash
   # Run on production server
   npm run migrate
   npm run seed
   ```

4. **Start Production Server**
   ```bash
   NODE_ENV=production npm start
   ```

### Environment Variables for Production

```env
NODE_ENV=production
PORT=3000
DB_HOST=your_production_db_host
DB_USER=your_production_db_user
DB_PASSWORD=your_production_db_password
DB_NAME=socx_database

# Use different secrets for production
JWT_SECRET=your_production_jwt_secret
JWT_REFRESH_SECRET=your_production_refresh_secret

# Security settings
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### Docker Deployment (Optional)

```dockerfile
# Dockerfile
FROM node:16-alpine
WORKDIR /app

# Install backend dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy backend source
COPY src/ ./src/

# Build frontend
COPY frontend/ ./frontend/
RUN cd frontend && npm ci && npm run build

# Copy built frontend to backend public folder
RUN mkdir -p src/public && cp -r frontend/build/* src/public/

EXPOSE 3000
CMD ["npm", "start"]
```

## 🔒 Security Features

### Authentication Security
- **JWT Tokens**: Secure token-based authentication
- **Password Hashing**: bcrypt dengan 12 rounds
- **Token Expiration**: Access tokens expire dalam 7 hari
- **Refresh Tokens**: Secure token refresh mechanism

### API Security
- **Rate Limiting**: 100 requests per 15 minutes per IP
- **CORS**: Configurable cross-origin resource sharing
- **Helmet**: Security headers protection
- **Input Validation**: Comprehensive validation dengan express-validator
- **SQL Injection Protection**: Parameterized queries

### Frontend Security
- **Token Storage**: Secure localStorage management
- **Auto-logout**: Automatic logout on token expiration
- **Route Protection**: Client-side route guards
- **XSS Protection**: React's built-in XSS protection

## 📚 Additional Documentation

- **[Backend API Docs](src/README.md)**: Detailed backend documentation
- **[Frontend Docs](frontend/README-FRONTEND.md)**: React application documentation
- **[Database Schema](src/database/README.md)**: Database structure and migrations

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Code Standards
- Follow ESLint configuration
- Write tests for new features
- Update documentation
- Use conventional commit messages

## 📄 License

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Email**: support@socx.com
- **Issues**: [GitHub Issues](https://github.com/your-repo/issues)
- **Documentation**: Check individual README files in subdirectories

---

**Built with ❤️ by Socx Development Team**