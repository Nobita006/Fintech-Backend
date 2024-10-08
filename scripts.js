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

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        try {
            const response = await fetch(SERVER_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();

            if (response.ok) {
                setUser(data.userId, data.token);
                window.location.href = 'dashboard.html';
            } else {
                document.getElementById('loginError').textContent = data.error;
            }
        } catch (error) {
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

// HANDLE TRANSACTION SUBMISSION
document.querySelector('#transactionForm form').addEventListener('submit', async function (e) {
    e.preventDefault();
    const amount = parseFloat(document.getElementById('amount').value);
    const transactionType = document.getElementById('transactionType').textContent.toLowerCase();
    const userId = getUserId(); // Get the logged-in user's ID
    const recipientEmail = document.getElementById('recipientEmail').value;

    // Clear the error message before any new transaction attempt
    document.getElementById('transactionError').textContent = '';

    // Validation: Check for negative or zero amount
    if (amount <= 0) {
        document.getElementById('transactionError').textContent = 'Amount must be a positive number.';
        return;
    }

    let mutation;
    let variables = { userId, amount };

    if (transactionType === 'withdraw') {
        const negativeAmount = -amount; // Calculate the negative amount
        mutation = `
            mutation Withdraw($userId: uuid!, $amount: numeric!) {
                insert_transactions_one(object: { user_id: $userId, type: "withdrawal", amount: $amount }) {
                    id
                }
                update_users_by_pk(pk_columns: { id: $userId }, _inc: { balance: $amount }) {
                    id
                    balance
                }
            }
        `;
        variables = { userId, amount: negativeAmount }; // Pass the negative amount
    } else if (transactionType === 'deposit') {
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
        const negativeAmount = -amount;

        try {
            // Perform the withdrawal first
            const withdrawResponse = await fetch(HASURA_ENDPOINT, {
                method: 'POST',
                headers: {
                    'content-type': 'application/json',
                    'x-hasura-admin-secret': HASURA_ADMIN_SECRET,
                    'Authorization': `Bearer ${getToken()}`,
                },
                body: JSON.stringify({
                    query: `
                        mutation Withdraw($userId: uuid!, $amount: numeric!) {
                            insert_transactions_one(object: { user_id: $userId, type: "withdrawal", amount: $amount }) {
                                id
                            }
                            update_users_by_pk(pk_columns: { id: $userId }, _inc: { balance: $amount }) {
                                id
                                balance
                            }
                        }
                    `,
                    variables: { userId, amount: negativeAmount },
                }),
            });

            const withdrawResult = await withdrawResponse.json();

            if (withdrawResult.errors) {
                document.getElementById('transactionError').textContent = withdrawResult.errors[0].message;
                return;
            }

            // If withdrawal is successful, perform the deposit
            const depositResponse = await fetch(HASURA_ENDPOINT, {
                method: 'POST',
                headers: {
                    'content-type': 'application/json',
                    'x-hasura-admin-secret': HASURA_ADMIN_SECRET,
                    'Authorization': `Bearer ${getToken()}`,
                },
                body: JSON.stringify({
                    query: `
                        mutation Deposit($recipientId: uuid!, $amount: numeric!) {
                            insert_transactions_one(object: { user_id: $recipientId, type: "deposit", amount: $amount }) {
                                id
                            }
                            update_users_by_pk(pk_columns: { id: $recipientId }, _inc: { balance: $amount }) {
                                id
                                balance
                            }
                        }
                    `,
                    variables: { recipientId, amount },
                }),
            });

            const depositResult = await depositResponse.json();

            if (depositResult.errors) {
                document.getElementById('transactionError').textContent = depositResult.errors[0].message;
                return;
            }

            // Update the UI after both operations are successful
            fetchUserData(); // Update balance
            document.querySelector('#transactionForm form').reset(); // Reset form input
            document.getElementById('transactionForm').style.display = 'none';
            fetchTransactions(); // Show updated transactions
        } catch (error) {
            document.getElementById('transactionError').textContent = 'An error occurred. Please try again.';
        }
    } else {
        // Hide the error message after a successful transaction
        document.getElementById('transactionError').textContent = '';
    }

    try {
        // Execute the mutation for deposit or withdraw
        if (transactionType === 'deposit' || transactionType === 'withdraw') {
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
                // Update the UI after a successful transaction
                fetchUserData(); // Update balance
                document.querySelector('#transactionForm form').reset(); // Reset form input
                document.getElementById('transactionForm').style.display = 'none';
                fetchTransactions(); // Show updated transactions
            }
        }
    } catch (error) {
        document.getElementById('transactionError').textContent = 'An error occurred. Please try again.';
    }
});

// Fetch transactions and update labels for transfers
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
                    transactions_as_recipient: transactions(where: { recipient_id: { _eq: $userId } }) {
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
    const receivedTransactions = data.data.transactions_as_recipient;

    const transactionList = document.getElementById('transactionList');
    transactionList.innerHTML = '';

    transactions.forEach(transaction => {
        const listItem = document.createElement('li');
        listItem.textContent = `${transaction.type === 'withdrawal' ? 'Withdraw' : 'Deposit'} of ₹${Math.abs(transaction.amount).toFixed(2)} on ${new Date(transaction.timestamp).toLocaleString()}`;
        transactionList.appendChild(listItem);
    });

    receivedTransactions.forEach(transaction => {
        const listItem = document.createElement('li');
        listItem.textContent = `Received ₹${Math.abs(transaction.amount).toFixed(2)} on ${new Date(transaction.timestamp).toLocaleString()}`;
        transactionList.appendChild(listItem);
    });

    document.getElementById('transactionForm').style.display = 'none';
    document.getElementById('transactionHistory').style.display = 'block';

    // Update the balance after fetching transactions
    fetchUserData();
}

// Logout function
function logout() {
    localStorage.removeItem('userId');
    localStorage.removeItem('token');
    window.location.href = 'index.html';
}
