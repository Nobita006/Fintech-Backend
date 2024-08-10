const bcrypt = require('bcrypt');

async function createHashedPassword() {
    const hashedPassword = await bcrypt.hash('1234', 10);
    console.log('Hashed Password:', hashedPassword);
    // Here, you would insert the hashed password into your database.
}

createHashedPassword();
