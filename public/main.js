document.addEventListener('DOMContentLoaded', async () => {
    try {
        const authManager = new AuthManager();
        await authManager.authenticate();
        
        const apiClient = new APIClient(authManager);
        const simulation = new EcosystemSimulation(authManager, apiClient);

        // Connect UI events
        document.getElementById('start-simulation').addEventListener('click', () => simulation.start());
        document.getElementById('pause-simulation').addEventListener('click', () => simulation.pause());
        document.getElementById('reset-simulation').addEventListener('click', () => simulation.reset());
        
        document.getElementById('organism-form').addEventListener('submit', (e) => simulation.handleFormSubmit(e));
    } catch (error) {
        console.error('Failed to initialize application:', error);
    }
});