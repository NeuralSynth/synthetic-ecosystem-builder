class AuthService {
    constructor() {
        this.token = localStorage.getItem('token');
        this.baseUrl = 'https://localhost:3000';
    }

    async login() {
        try {
            const response = await fetch(`${this.baseUrl}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) throw new Error('Login failed');

            const data = await response.json();
            this.token = data.token;
            localStorage.setItem('token', this.token);
            return true;
        } catch (error) {
            console.error('Authentication failed:', error);
            return false;
        }
    }

    getHeaders() {
        return {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': 'application/json'
        };
    }

    isAuthenticated() {
        return !!this.token;
    }
}