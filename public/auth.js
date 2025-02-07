class AuthManager {
    constructor() {
        this.token = null;
        this.isAuthenticated = false;
    }

    getAuthHeaders() {
        return {
            'Authorization': this.token ? `Bearer ${this.token}` : ''
        };
    }

    async authenticate() {
        try {
            const response = await fetch('/api/auth');
            const data = await response.json();
            this.token = data.token;
            this.isAuthenticated = true;
            return true;
        } catch (error) {
            console.error('Authentication failed:', error);
            return false;
        }
    }
}