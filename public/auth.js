class AuthManager {
    constructor() {
        this.token = localStorage.getItem('token');
        this.isAuthenticated = false;
        this.baseURL = window.location.protocol === 'https:' 
            ? 'https://localhost:3443' 
            : 'http://localhost:3000';
    }

    async authenticate() {
        try {
            const response = await fetch(`${this.baseURL}/api/auth`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            this.token = data.token;
            this.isAuthenticated = true;
            localStorage.setItem('token', this.token);
            return true;
        } catch (error) {
            console.error('Authentication failed:', error);
            this.isAuthenticated = false;
            localStorage.removeItem('token');
            return false;
        }
    }

    getAuthHeaders() {
        return {
            'Authorization': this.token ? `Bearer ${this.token}` : ''
        };
    }
}