const API_URL = 'http://localhost:3000';

async function testAuth() {
    try {
        console.log('Testing Registration...');
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

        if (!registerResponse.ok) {
            const text = await registerResponse.text();
            throw new Error(`Register failed: ${registerResponse.status} ${text}`);
        }
        const registerData = await registerResponse.json();
        console.log('Register Success:', registerData);

        console.log('Testing Login...');
        const loginResponse = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email,
                password: 'password123'
            })
        });

        if (!loginResponse.ok) {
            const text = await loginResponse.text();
            throw new Error(`Login failed: ${loginResponse.status} ${text}`);
        }

        const loginData: unknown = await loginResponse.json();
        console.log('Login Success. Token received.');
        if (
            !loginData ||
            typeof loginData !== 'object' ||
            !('token' in loginData) ||
            typeof (loginData as { token: unknown }).token !== 'string'
        ) {
            throw new Error('Login response missing token');
        }
        const token = (loginData as { token: string }).token;

        // Verify invalid login
        console.log('Testing Invalid Login...');
        const invalidLoginResponse = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email,
                password: 'wrongpassword'
            })
        });

        if (invalidLoginResponse.status === 401) {
            console.log('Invalid Login Success: Got 401 as expected');
        } else {
            console.error('Invalid Login Error: Expected 401 but got', invalidLoginResponse.status);
        }

    } catch (error: unknown) {
        if (error instanceof Error) {
            console.error('Test Failed:', error.message);
            return;
        }
        console.error('Test Failed:', String(error));
    }
}

testAuth();
