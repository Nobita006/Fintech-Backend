const HASURA_ENDPOINT = 'https://optimal-albacore-82.hasura.app/v1/graphql';
const HASURA_ADMIN_SECRET = 'VCg3SANTorPvP23bByMcr5UBk2G9MVN45l2qfC9zCPIINkT9wUmjJZnJ5RACM1c6';
const SERVER_ENDPOINT = 'http://localhost:5000/login';

// Store user ID and JWT in localStorage
const setUser = (userId, token) => {
    localStorage.setItem('userId', userId);
    localStorage.setItem('token', token);
};
const getUserId = () => localStorage.getItem('userId');
const getToken = () => localStorage.getItem('token');

// LOGIN
const loginForm = document.getElementById('loginForm');

if (loginForm) {
    loginForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        console.log('Login form submitted');

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        console.log('Email:', email);
        console.log('Password:', password);

        try {
            const response = await fetch(SERVER_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();
            console.log('Response data:', data);

            if (response.ok) {
                console.log('Login successful');
                setUser(data.userId, data.token);
                window.location.href = 'dashboard.html';
            } else {
                console.error('Login failed:', data.error);
                document.getElementById('loginError').textContent = data.error;
            }
        } catch (error) {
            console.error('Error during login:', error);
            document.getElementById('loginError').textContent = 'An error occurred. Please try again.';
        }
    });
}

// FETCH USER DATA
const fetchUserData = async () => {
    const token = getToken();
    const userId = getUserId();
    if (!token || !userId) {
        window.location.href = 'index.html';
        return;
    }

    const response = await fetch(HASURA_ENDPOINT, {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            'x-hasura-admin-secret': HASURA_ADMIN_SECRET,
            'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
            query: `
                query GetUser($id: uuid!) {
                    users_by_pk(id: $id) {
                        name
                        balance
                    }
                }
            `,
            variables: { id: userId },
        }),
    });

    const data = await response.json();
    const user = data.data.users_by_pk;

    if (user) {
        document.getElementById('username').textContent = user.name;
        document.getElementById('balance').textContent = user.balance.toFixed(2);
    } else {
        document.getElementById('username').textContent = 'User not found';
        document.getElementById('balance').textContent = 'N/A';
    }
};

// Ensure fetchUserData is called when the page loads
if (window.location.pathname.endsWith('dashboard')) {
    fetchUserData();
}

// SHOW DEPOSIT FORM
function showDepositForm() {
    document.getElementById('transactionType').textContent = 'Deposit';
    document.getElementById('recipientEmail').style.display = 'none'; // Hide recipient email field for deposits
    document.getElementById('transactionForm').style.display = 'block';
    document.getElementById('transactionHistory').style.display = 'none';
}

// SHOW WITHDRAW FORM
function showWithdrawForm() {
    document.getElementById('transactionType').textContent = 'Withdraw';
    document.getElementById('recipientEmail').style.display = 'none'; // Hide recipient email field for withdrawals
    document.getElementById('transactionForm').style.display = 'block';
    document.getElementById('transactionHistory').style.display = 'none';
}

// SHOW TRANSFER FORM
function showTransferForm() {
    document.getElementById('transactionType').textContent = 'Transfer';
    document.getElementById('recipientEmail').style.display = 'block'; // Show recipient email field for transfers
    document.getElementById('transactionForm').style.display = 'block';
    document.getElementById('transactionHistory').style.display = 'none';
}

// FETCH TRANSACTIONS
async function fetchTransactions() {
    const token = getToken();
    const userId = getUserId();
    if (!token || !userId) {
        window.location.href = 'index.html';
        return;
    }

    const response = await fetch(HASURA_ENDPOINT, {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            'x-hasura-admin-secret': HASURA_ADMIN_SECRET,
            'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
            query: `
                query GetTransactions($userId: uuid!) {
                    transactions(where: { user_id: { _eq: $userId } }) {
                        id
                        type
                        amount
                        timestamp
                    }
                }
            `,
            variables: { userId: userId },
        }),
    });

    const data = await response.json();
    const transactions = data.data.transactions;

    const transactionList = document.getElementById('transactionList');
    transactionList.innerHTML = '';

    transactions.forEach(transaction => {
        const listItem = document.createElement('li');
        listItem.textContent = `${transaction.type} of $${transaction.amount.toFixed(2)} on ${new Date(transaction.timestamp).toLocaleString()}`;
        transactionList.appendChild(listItem);
    });

    document.getElementById('transactionForm').style.display = 'none';
    document.getElementById('transactionHistory').style.display = 'block';
}

// HANDLE TRANSACTION SUBMISSION
document.querySelector('#transactionForm form').addEventListener('submit', async function (e) {
    e.preventDefault();
    const amount = parseFloat(document.getElementById('amount').value);
    const transactionType = document.getElementById('transactionType').textContent.toLowerCase();
    const userId = getUserId(); // Get the logged-in user's ID
    const recipientEmail = document.getElementById('recipientEmail').value;

    let mutation;
    let variables = { userId, amount };

    if (transactionType === 'deposit') {
        mutation = `
            mutation Deposit($userId: uuid!, $amount: numeric!) {
                insert_transactions_one(object: { user_id: $userId, type: "deposit", amount: $amount }) {
                    id
                }
                update_users_by_pk(pk_columns: { id: $userId }, _inc: { balance: $amount }) {
                    id
                    balance
                }
            }
        `;
    } else if (transactionType === 'withdraw') {
        mutation = `
            mutation Withdraw($userId: uuid!, $amount: numeric!) {
                insert_transactions_one(object: { user_id: $userId, type: "withdrawal", amount: $amount }) {
                    id
                }
                update_users_by_pk(pk_columns: { id: $userId }, _inc: { balance: -$amount }) {
                    id
                    balance
                }
            }
        `;
    } else if (transactionType === 'transfer') {
        // Fetch recipient user ID by email
        const recipientResponse = await fetch(HASURA_ENDPOINT, {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
                'x-hasura-admin-secret': HASURA_ADMIN_SECRET,
            },
            body: JSON.stringify({
                query: `
                    query GetRecipient($email: String!) {
                        users(where: {email: {_eq: $email}}) {
                            id
                        }
                    }
                `,
                variables: { email: recipientEmail },
            }),
        });

        const recipientData = await recipientResponse.json();
        const recipient = recipientData.data.users[0];

        if (!recipient) {
            document.getElementById('transactionError').textContent = 'Recipient not found';
            return;
        }

        const recipientId = recipient.id;

        mutation = `
            mutation Transfer($userId: uuid!, $recipientId: uuid!, $amount: numeric!) {
                insert_transactions_one(object: { user_id: $userId, type: "withdrawal", amount: $amount }) {
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
        `;
        variables.recipientId = recipientId;
    }

    try {
        const response = await fetch(HASURA_ENDPOINT, {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
                'x-hasura-admin-secret': HASURA_ADMIN_SECRET,
                'Authorization': `Bearer ${getToken()}`,
            },
            body: JSON.stringify({
                query: mutation,
                variables: variables,
            }),
        });

        const result = await response.json();

        if (result.errors) {
            document.getElementById('transactionError').textContent = result.errors[0].message;
        } else {
            fetchUserData(); // Update balance
            document.querySelector('#transactionForm form').reset(); // Reset form input
            document.getElementById('transactionForm').style.display = 'none';
            fetchTransactions(); // Show updated transactions
        }
    } catch (error) {
        console.error('Error during transaction:', error);
        document.getElementById('transactionError').textContent = 'An error occurred. Please try again.';
    }
});
