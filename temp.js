const bcrypt = require('bcrypt');

async function createHashedPassword() {
    const hashedPassword = await bcrypt.hash('1234', 10);
    console.log('Hashed Password:', hashedPassword);
}

createHashedPassword();
