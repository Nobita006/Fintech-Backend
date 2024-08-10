const express = require('express');
const bcrypt = require('bcrypt');
const bodyParser = require('body-parser');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = 5000;

app.use(cors());
app.use(bodyParser.json());

const HASURA_ENDPOINT = 'https://optimal-albacore-82.hasura.app/v1/graphql';
const HASURA_ADMIN_SECRET = 'VCg3SANTorPvP23bByMcr5UBk2G9MVN45l2qfC9zCPIINkT9wUmjJZnJ5RACM1c6';

// Login route
app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const response = await fetch(HASURA_ENDPOINT, {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
                'x-hasura-admin-secret': HASURA_ADMIN_SECRET,
            },
            body: JSON.stringify({
                query: `
                    query Login($email: String!) {
                        users(where: {email: {_eq: $email}}) {
                            id
                            name
                            password_hash
                        }
                    }
                `,
                variables: { email },
            }),
        });

        const data = await response.json();

        if (data.errors || data.data.users.length === 0) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const user = data.data.users[0];

        const isPasswordCorrect = await bcrypt.compare(password, user.password_hash);

        if (isPasswordCorrect) {
            // Generate a token (mocked here)
            const token = 'mock-jwt-token';

            // Send back user ID and token
            res.json({ userId: user.id, token });
        } else {
            res.status(401).json({ error: 'Invalid email or password' });
        }
    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).json({ error: 'An error occurred. Please try again.' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
