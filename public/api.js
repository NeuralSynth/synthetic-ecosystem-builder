class APIClient {
    constructor(authManager) {
        this.authManager = authManager;
        this.baseURL = window.location.origin;
        this.retryAttempts = 3;
    }
    
    async request(endpoint, options = {}) {
        let attempts = 0;
        while (attempts < this.retryAttempts) {
            try {
                const response = await fetch(`${this.baseURL}${endpoint}`, {
                    ...options,
                    headers: {
                        'Content-Type': 'application/json',
                        ...options.headers,
                        ...this.authManager.getAuthHeaders()
                    }
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
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