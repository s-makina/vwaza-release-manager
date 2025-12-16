const API_URL = 'http://localhost:3001';

async function testAuth() {
    try {
        console.log('Testing Registration on 3001...');
        const email = `test-${Date.now()}@example.com`;

        const registerResponse = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email,
                password: 'password123',
                role: 'ARTIST'
            })
        });

        console.log('Register Status:', registerResponse.status);
        const text = await registerResponse.text();

        if (!registerResponse.ok) {
            console.error('Register Log:', text);
            throw new Error(`Register failed: ${registerResponse.status}`);
        }

        console.log('Register Success:', JSON.parse(text));

        console.log('Testing Login on 3001...');
        const loginResponse = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email,
                password: 'password123'
            })
        });

        console.log('Login Status:', loginResponse.status);
        if (!loginResponse.ok) {
            throw new Error(`Login failed: ${loginResponse.status} ${await loginResponse.text()}`);
        }

        const loginData = await loginResponse.json();
        console.log('Login Success. Token received.');

        // Cleanup / Stop server not needed as validation is done
    } catch (error) {
        console.error('Test Failed:', error.message);
    }
}

testAuth();
