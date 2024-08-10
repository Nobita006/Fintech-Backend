# Simplified Fintech Platform

This project is a simple Fintech platform that allows users to deposit, withdraw, transfer funds, and view transaction history. The application is built using HTML, CSS, Bootstrap, JavaScript for the frontend, and Node.js with Express for the backend. The backend communicates with a Hasura GraphQL API for managing users and transactions.

## Login Credentials
- email - 1@gmail.com    Password - 123
- email - 2@gmail.com    Password - 1234

## Table of Contents

1. [Setup Instructions](#setup-instructions)
   - [Backend Setup](#backend-setup)
   - [Frontend Setup](#frontend-setup)
2. [API Documentation](#api-documentation)
   - [Login API](#login-api)
   - [GraphQL Queries and Mutations](#graphql-queries-and-mutations)
3. [Design Decisions and Assumptions](#design-decisions-and-assumptions)

---

## Setup Instructions

### Backend Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Nobita006/Fintech-Backend.git
   ```

2. **Install dependencies**:
   Ensure that Node.js is installed on your machine. Then, run:
   ```bash
   npm install
   ```

3. **Run the backend server**:
   Start the server by running:
   ```bash
   node server.js
   ```

   The backend server will be running at `http://localhost:5000`.

### Frontend Setup

1. **Run the frontend**:
   Start the frontend by running:
   ```bash
    npx serve .  
   ```

2. **Navigate**:
   - The login page should be the first page you see.
   - After logging in, you will be redirected to the dashboard where you can manage your transactions.

---

## API Documentation

### Login API

**Endpoint:** `/login`  
**Method:** `POST`  
**Description:** Authenticates a user by email and password.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**

- **Success (200 OK):**
  ```json
  {
    "userId": "user-uuid",
    "token": "mock-jwt-token"
  }
  ```
- **Error (401 Unauthorized):**
  ```json
  {
    "error": "Invalid email or password"
  }
  ```
  
### GraphQL Queries and Mutations

**Endpoint:** `https://optimal-albacore-82.hasura.app/v1/graphql`  
**Method:** `POST`  
**Headers:**
```json
{
  "content-type": "application/json",
  "x-hasura-admin-secret": "YOUR_ADMIN_SECRET",
  "Authorization": "Bearer mock-jwt-token"
}
```

#### 1. Get User Data

**Query:**
```graphql
query GetUser($id: uuid!) {
    users_by_pk(id: $id) {
        name
        balance
    }
}
```

**Variables:**
```json
{
  "id": "user-uuid"
}
```

#### 2. Deposit

**Mutation:**
```graphql
mutation Deposit($userId: uuid!, $amount: numeric!) {
    insert_transactions_one(object: { user_id: $userId, type: "deposit", amount: $amount }) {
        id
    }
    update_users_by_pk(pk_columns: { id: $userId }, _inc: { balance: $amount }) {
        id
        balance
    }
}
```

**Variables:**
```json
{
  "userId": "user-uuid",
  "amount": 1000.00
}
```

#### 3. Withdraw

**Mutation:**
```graphql
mutation Withdraw($userId: uuid!, $amount: numeric!) {
    insert_transactions_one(object: { user_id: $userId, type: "withdrawal", amount: $amount }) {
        id
    }
    update_users_by_pk(pk_columns: { id: $userId }, _inc: { balance: -$amount }) {
        id
        balance
    }
}
```

**Variables:**
```json
{
  "userId": "user-uuid",
  "amount": 500.00
}
```

#### 4. Transfer

**Mutation:**
```graphql
mutation Transfer($userId: uuid!, $recipientId: uuid!, $amount: numeric!) {
    insert_transactions_one(object: { user_id: $userId, type: "withdrawal", amount: -$amount }) {
        id
    }
    update_users_by_pk(pk_columns: { id: $userId }, _inc: { balance: -$amount }) {
        id
        balance
    }
    insert_transactions_one(object: { user_id: $recipientId, type: "deposit", amount: $amount }) {
        id
    }
    update_users_by_pk(pk_columns: { id: $recipientId }, _inc: { balance: $amount }) {
        id
        balance
    }
}
```

**Variables:**
```json
{
  "userId": "sender-uuid",
  "recipientId": "recipient-uuid",
  "amount": 500.00
}
```

---

## Design Decisions and Assumptions

### 1. Authentication
- For simplicity, the project uses a mock JWT token for authentication. In a production environment, a real JWT token should be generated using a library like `jsonwebtoken`.

### 2. Password Handling
- Passwords are hashed using `bcrypt`.

### 3. Data Validation
- Basic validation is implemented on the frontend to prevent negative or zero transactions.
- Further server-side validation should be implemented to ensure data integrity and security.

### 4. Transaction Management
- The system is designed to handle multiple types of transactions: deposits, withdrawals, and transfers.
- Transfers are treated as a combination of withdrawal and deposit operations to ensure both parties' balances are updated correctly.

### 5. Error Handling
- Basic error handling is implemented. Future iterations should include more robust error handling and logging mechanisms.

### 6. UI Design
- The UI is simple and uses Bootstrap for basic styling. The focus is on functionality rather than aesthetic design.

---
