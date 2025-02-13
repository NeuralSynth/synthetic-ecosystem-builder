class Organism {
    constructor(name, type, traits, canvas) {
        this.name = name;
        this.type = type;
        this.traits = {
            ...traits,
            tempOptimal: 25,
            humidityOptimal: 60,
            pHOptimal: 7,
            history: {
                energy: [],
                growth: [],
                age: []
            }
        };
        this.position = {
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            dx: (Math.random() - 0.5) * 2,
            dy: (Math.random() - 0.5) * 2
        };
        this.energy = 100;
        this.age = 0;
        this.size = 5;
    }

    update(ecosystem) {
        // Update position
        this.position.x += this.position.dx;
        this.position.y += this.position.dy;

        // Environmental effects
        const tempDiff = Math.abs(ecosystem.temperature - this.traits.tempOptimal);
        const humidityDiff = Math.abs(ecosystem.humidity - this.traits.humidityOptimal);
        const pHDiff = Math.abs(ecosystem.pH - this.traits.pHOptimal);

        // Calculate stress factors
        const environmentalStress = (tempDiff + humidityDiff + pHDiff) / 100;
        
        // Update energy based on environmental conditions
        this.energy -= environmentalStress * (1 - this.traits.resilience / 100);
        this.energy = Math.max(0, Math.min(100, this.energy));

        // Update age
        this.age++;

        // Update history
        this.traits.history.energy.push(this.energy);
        this.traits.history.growth.push(this.size);
        this.traits.history.age.push(this.age);
    }

    draw(ctx) {
        ctx.beginPath();
        ctx.arc(this.position.x, this.position.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = this.energy > 50 ? '#4CAF50' : '#f44336';
        ctx.fill();
        ctx.closePath();
    }
}

class EcosystemSimulation {
    constructor(authManager, apiClient) {
        this.authManager = authManager;
        this.apiClient = apiClient;
        this.canvas = document.getElementById('ecosystem-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.organisms = [];
        this.running = false;
        this.environmentalCycles = { time: 0 };
        
        this.resizeCanvas();
        this.setupEventListeners();
        this.setupFormHandling();
    }

    async initialize() {
        if (!this.authManager.isAuthenticated) {
            await this.authManager.authenticate();
        }
        try {
            await this.loadInitialState();
        } catch (error) {
            console.error('Failed to initialize simulation:', error);
        }
    }

    async loadInitialState() {
        try {
            const organisms = await this.apiClient.request('/api/organisms', {
                method: 'GET'
            });
            
            organisms.forEach(org => {
                this.organisms.push(new Organism(
                    org.name,
                    org.type,
                    org.traits,
                    this.canvas
                ));
            });
        } catch (error) {
            console.error('Error loading initial state:', error);
        }
    }

    resizeCanvas() {
        this.canvas.width = this.canvas.offsetWidth;
        this.canvas.height = this.canvas.offsetHeight;
    }

    setupEventListeners() {
        document.getElementById('start-simulation').addEventListener('click', () => this.start());
        document.getElementById('pause-simulation').addEventListener('click', () => this.pause());
        document.getElementById('reset-simulation').addEventListener('click', () => this.reset());
    }

    setupFormHandling() {
        document.getElementById('organism-form').addEventListener('submit', (e) => this.handleFormSubmit(e));
    }

    async handleFormSubmit(event) {
        event.preventDefault();
        const formData = new FormData(event.target);
        
        const organism = new Organism(
            formData.get('name'),
            formData.get('type'),
            {
                growthRate: parseInt(formData.get('growth-rate')),
                resourceConsumption: parseInt(formData.get('resource-consumption')),
                resilience: parseInt(formData.get('resilience'))
            },
            this.canvas
        );

        try {
            await this.apiClient.request('/api/organisms', {
                method: 'POST',
                body: JSON.stringify(organism)
            });
            this.organisms.push(organism);
        } catch (error) {
            console.error('Failed to create organism:', error);
        }
    }

    start() {
        if (!this.running) {
            this.running = true;
            this.update();
        }
    }

    pause() {
        this.running = false;
    }

    reset() {
        this.organisms = [];
        this.running = false;
        this.clear();
    }

    clear() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    async updateEnvironment() {
        try {
            const environmentData = {
                temperature: Math.sin(this.environmentalCycles.time * Math.PI / 180) * 15 + 25,
                humidity: 60 + Math.sin(this.environmentalCycles.time * Math.PI / 180) * 20,
                pH: 7 + Math.sin(this.environmentalCycles.time * Math.PI / 180) * 0.5,
                resources: {
                    light: Math.sin(this.environmentalCycles.time * Math.PI / 180) * 500 + 500,
                    water: 1000,
                    nutrients: 1000
                }
            };

            await this.apiClient.request('/api/ecosystem', {
                method: 'PUT',
                body: JSON.stringify(environmentData)
            });
            
            return environmentData;
        } catch (error) {
            console.error('Error updating environment:', error);
            throw error;
        }
    }

    async update() {
        if (!this.running) return;
        
        try {
            const ecosystem = await this.apiClient.request('/api/ecosystem', {
                method: 'GET'
            });

            this.clear();
            
            for (const organism of this.organisms) {
                organism.update(ecosystem);
                organism.draw(this.ctx);
            }

            this.updateStats(ecosystem);
            requestAnimationFrame(() => this.update());
        } catch (error) {
            console.error('Error updating simulation:', error);
            this.pause();
        }
    }

    updateStats(environment) {
        if (!environment) return;
        document.getElementById('temperature').textContent = `Temperature: ${environment.temperature.toFixed(1)}°C`;
        document.getElementById('humidity').textContent = `Humidity: ${environment.humidity.toFixed(1)}%`;
        document.getElementById('pH').textContent = `pH: ${environment.pH.toFixed(2)}`;
        document.getElementById('resources').textContent = `Light: ${environment.resources.light.toFixed(0)}`;
    }

    setupAnalytics() {
        setInterval(() => this.recordStats(), 1000);
    }

    recordStats() {
        if (!this.running) return;

        // Record population data
        const populationData = {
            timestamp: Date.now(),
            total: this.organisms.length,
            byType: {
                producer: this.organisms.filter(o => o.type === 'producer').length,
                consumer: this.organisms.filter(o => o.type === 'consumer').length,
                decomposer: this.organisms.filter(o => o.type === 'decomposer').length
            }
        };

        this.stats.populationHistory.push(populationData);

        // Update species distribution
        this.organisms.forEach(organism => {
            if (!this.stats.speciesDistribution[organism.type]) {
                this.stats.speciesDistribution[organism.type] = 0;
            }
            this.stats.speciesDistribution[organism.type]++;
        });

        // Generate report if enough data
        if (this.stats.populationHistory.length % 60 === 0) {
            this.generateReport();
        }
    }

    generateReport() {
        const report = {
            timeElapsed: Math.floor((Date.now() - this.stats.populationHistory[0].timestamp) / 1000),
            averagePopulation: this.stats.populationHistory.reduce((acc, curr) => acc + curr.total, 0) / this.stats.populationHistory.length,
            speciesDistribution: this.stats.speciesDistribution,
            survivalRate: this.calculateSurvivalRate()
        };

        console.log('Ecosystem Report:', report);
        return report;
    }

    calculateSurvivalRate() {
        const initialCount = this.stats.populationHistory[0].total;
        const currentCount = this.stats.populationHistory[this.stats.populationHistory.length - 1].total;
        return (currentCount / initialCount) * 100;
    }
}

// Initialize simulation when page loads
document.addEventListener('DOMContentLoaded', () => {
    const authManager = new AuthManager();
    const apiClient = new APIClient(authManager);
    const simulation = new EcosystemSimulation(authManager, apiClient);
    simulation.initialize();
});