class APIClient {
    constructor(authManager) {
        this.authManager = authManager;
        // Use window.location.origin instead of process.env
        this.baseURL = 'http://localhost:3000';
        this.retryAttempts = 3;
    }
    
    async request(endpoint, options = {}) {
        let attempts = 0;
        while (attempts < this.retryAttempts) {
            try {
                const response = await fetch(`${this.baseURL}${endpoint}`, {
                    ...options,
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json',
                        ...options.headers,
                        ...this.authManager.getAuthHeaders()
                    }
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
                }

                return await response.json();
            } catch (error) {
                attempts++;
                if (attempts === this.retryAttempts) {
                    throw error;
                }
                await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
            }
        }
    }
}