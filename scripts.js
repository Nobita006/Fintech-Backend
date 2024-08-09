const HASURA_ENDPOINT = 'https://optimal-albacore-82.hasura.app/v1/graphql';
const HASURA_ADMIN_SECRET = 'VCg3SANTorPvP23bByMcr5UBk2G9MVN45l2qfC9zCPIINkT9wUmjJZnJ5RACM1c6';

// Store JWT in localStorage (for production, consider using HttpOnly cookies)
const setToken = (token) => localStorage.setItem('token', token);
const getToken = () => localStorage.getItem('token');

// LOGIN
const loginForm = document.getElementById('loginForm');

if (loginForm) {
    loginForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        // Perform login (mock login for now)
        if (email === '123@gmail.com' && password === '123') {
            setToken('mock-jwt-token');
            window.location.href = 'dashboard.html';
        } else {
            document.getElementById('loginError').textContent = 'Invalid email or password';
        }
    });
}

// FETCH USER DATA
const fetchUserData = async () => {
    const token = getToken();
    if (!token) {
        window.location.href = 'index.html';
        return;
    }

    const response = await fetch(HASURA_ENDPOINT, {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            'x-hasura-admin-secret': HASURA_ADMIN_SECRET,
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            query: `
                query GetUser {
                    users_by_pk(id: "c2bdf7da-bd3f-4f39-8f5b-0b0c74c5a45b") {
                        name
                        balance
                    }
                }
            `
        })
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

if (window.location.pathname.endsWith('dashboard.html')) {
    fetchUserData();
}

// SHOW DEPOSIT FORM
function showDepositForm() {
    document.getElementById('transactionType').textContent = 'Deposit';
    document.getElementById('transactionForm').style.display = 'block';
    document.getElementById('transactionHistory').style.display = 'none';
}

// SHOW WITHDRAW FORM
function showWithdrawForm() {
    document.getElementById('transactionType').textContent = 'Withdraw';
    document.getElementById('transactionForm').style.display = 'block';
    document.getElementById('transactionHistory').style.display = 'none';
}

// FETCH TRANSACTIONS
async function fetchTransactions() {
    const token = getToken();
    if (!token) {
        window.location.href = 'index.html';
        return;
    }

    const response = await fetch(HASURA_ENDPOINT, {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            'x-hasura-admin-secret': HASURA_ADMIN_SECRET,
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            query: `
                query GetTransactions {
                    transactions(where: { user_id: { _eq: "c2bdf7da-bd3f-4f39-8f5b-0b0c74c5a45b" } }) {
                        id
                        type
                        amount
                        timestamp
                    }
                }
            `
        })
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
document.getElementById('transactionForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    const amount = parseFloat(document.getElementById('amount').value);
    const transactionType = document.getElementById('transactionType').textContent.toLowerCase();
    const user_id = "c2bdf7da-bd3f-4f39-8f5b-0b0c74c5a45b"; // Replace with actual user_id

    const mutation = transactionType === 'deposit' ? `
        mutation Deposit {
            insert_transactions_one(object: { user_id: "${user_id}", type: "deposit", amount: ${amount} }) {
                id
            }
            update_users_by_pk(pk_columns: { id: "${user_id}" }, _inc: { balance: ${amount} }) {
                id
                balance
            }
        }
    ` : `
        mutation Withdraw {
            insert_transactions_one(object: { user_id: "${user_id}", type: "withdrawal", amount: ${amount} }) {
                id
            }
            update_users_by_pk(pk_columns: { id: "${user_id}" }, _inc: { balance: -${amount} }) {
                id
                balance
            }
        }
    `;

    const response = await fetch(HASURA_ENDPOINT, {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            'x-hasura-admin-secret': HASURA_ADMIN_SECRET,
            'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify({ query: mutation })
    });

    const result = await response.json();

    if (result.errors) {
        document.getElementById('transactionError').textContent = result.errors[0].message;
    } else {
        fetchUserData(); // Update balance
        document.getElementById('transactionForm').reset();
        document.getElementById('transactionForm').style.display = 'none';
        fetchTransactions(); // Show updated transactions
    }
});
