const API_URL = 'http://localhost:3000';

async function testAuth() {
    try {
        console.log('Testing Registration...');
        const email = `test-${Date.now()}@example.com`;

        try {
            const registerResponse = await fetch(`${API_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email,
                    password: 'password123',
                    role: 'ARTIST'
                })
            });

            console.log('Register Status:', registerResponse.status, registerResponse.statusText);
            const text = await registerResponse.text();
            if (!registerResponse.ok) {
                console.error('Register Failed Body Preview:', text.substring(0, 500));
                throw new Error(`Register failed: ${registerResponse.status}`);
            }
            const registerData = JSON.parse(text);
            console.log('Register Success:', registerData);
        } catch (e) {
            console.error('Register Step Error:', e.message);
            return; // Stop if register fails
        }

        console.log('Testing Login...');
        try {
            const loginResponse = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email,
                    password: 'password123'
                })
            });

            console.log('Login Status:', loginResponse.status);
            const text = await loginResponse.text();
            if (!loginResponse.ok) {
                console.error('Login Failed Body Preview:', text.substring(0, 500));
                throw new Error(`Login failed: ${loginResponse.status}`);
            }

            const loginData = JSON.parse(text);
            console.log('Login Success. Token received.');
            const token = loginData.token;
        } catch (e) {
            console.error('Login Step Error:', e.message);
        }

    } catch (error) {
        console.error('Test Failed:', error.message);
    }
}

if (typeof fetch === 'undefined') {
    console.error('Fetch is not defined in this Node environment. Please use Node 18+');
} else {
    testAuth();
}
