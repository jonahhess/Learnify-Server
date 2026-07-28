# Learnify-Server

Backend server for Learnify app

Learnify is a web platform that uses AI to automatically generate educational courses. This server provides the backend for the Learnify application, managing users, courses, and their content. It features a powerful AI service that can create complete courses, including outlines, lessons, and quizzes, from just a title.

### Courses API

`GET /api/courses` now supports pagination, filtering, and sorting.

Query parameters:

- `page` (number, default `1`)
- `limit` (number, default `25`, max `100`)
- `sortBy` (`createdAt`, `updatedAt`, `title`, `views`, `likes`)
- `sortOrder` (`asc` or `desc`, default `desc`)
- `search` (case-insensitive title search)
- `keyword` (exact match from `keywords` array)
- `all=true` (returns all matching records in one response)

Response shape:

- `data`: course array
- `meta`: `{ total, page, limit, totalPages, hasNextPage, hasPreviousPage, sortBy, sortOrder, filters }`

### Security Features

- **Authentication & Authorization:** Secure user access with JSON Web Tokens (JWT) managed through the `auth.js` middleware.
- **Rate Limiting:** Protects against brute-force and denial-of-service attacks using the `rateLimiter.js` middleware.
- **Input Validation:** Input validation ensures the data is correct.
- **Centralized Error Handling:** The `errorHandler.js` middleware prevents sensitive information from being leaked in error messages.
- **Secret Management:** API keys and other secrets are managed securely through environment variables.
