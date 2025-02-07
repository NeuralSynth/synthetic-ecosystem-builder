// public/simulation.js
class Organism {
    // Add new environmental response traits
    constructor(name, type, traits, canvas) {  // Add canvas parameter
        this.name = name;
        this.type = type;
        this.traits = {
            ...traits,
            // Add temperature, humidity and pH tolerance
            tempOptimal: 25,
            humidityOptimal: 60,
            pHOptimal: 7,
            // Track historical data
            history: {
                energy: [],
                growth: [],
                age: []
            }
        };
        // Use passed canvas parameter
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
        // Update organism state based on traits and environment
        this.energy -= this.traits.resourceConsumption;
        this.age++;
        
        // Growth
        if (this.energy > 50) {
            this.energy += this.traits.growthRate;
        }
        
        // Resource consumption
        if (this.type === 'producer') {
            this.photosynthesize(ecosystem);
        } else if (this.type === 'consumer') {
            this.consumeOthers(ecosystem);
        } else if (this.type === 'decomposer') {
            this.decompose(ecosystem);
        }
        
        // Environmental effects
        this.handleEnvironmentalEffects(ecosystem);

        // Reproduction
        this.reproduce(ecosystem);

        // Check for death
        if (this.die()) {
            const index = ecosystem.organisms.indexOf(this);
            if (index > -1) {
                ecosystem.organisms.splice(index, 1);
            }
        }
    }

    photosynthesize(ecosystem) {
        const lightConsumption = this.traits.resourceConsumption;
        if (ecosystem.resources.light >= lightConsumption) {
            ecosystem.resources.light -= lightConsumption;
            this.energy += this.traits.growthRate * 2;
        }
    }

    consumeOthers(ecosystem) {
        // Implement predator-prey interactions
        this.organisms.forEach(prey => {
            if (prey !== this && prey.type === 'producer' && this.type === 'consumer') {
                const distance = Math.hypot(
                    this.position.x - prey.position.x,
                    this.position.y - prey.position.y
                );
                
                if (distance < this.size + prey.size) {
                    this.energy += prey.energy * 0.5;
                    prey.energy = 0; // Prey dies
                }
            }
        });
    }

    decompose(ecosystem) {
        // Implement decomposition mechanics
        ecosystem.resources.nutrients += this.traits.resourceConsumption;
        this.energy += this.traits.growthRate * 
            (ecosystem.resources.nutrients / 1000) * 
            (ecosystem.humidity / 100);
    }

    handleEnvironmentalEffects(ecosystem) {
        // Calculate environmental stress
        const tempStress = Math.abs(this.traits.tempOptimal - ecosystem.temperature) / this.traits.resilience;
        const humidityStress = Math.abs(this.traits.humidityOptimal - ecosystem.humidity) / this.traits.resilience;
        const pHStress = Math.abs(this.traits.pHOptimal - ecosystem.pH) / this.traits.resilience;
        
        // Apply combined environmental effects
        const totalStress = (tempStress + humidityStress + pHStress) / 3;
        this.energy -= totalStress;

        // Move organism
        this.position.x += this.position.dx;
        this.position.y += this.position.dy;

        // Bounce off walls
        if (this.position.x < 0 || this.position.x > canvas.width) this.position.dx *= -1;
        if (this.position.y < 0 || this.position.y > canvas.height) this.position.dy *= -1;

        // Record historical data
        this.traits.history.energy.push(this.energy);
        this.traits.history.growth.push(this.size);
        this.traits.history.age.push(this.age);
    }

    reproduce(ecosystem) {
        if (this.energy > 150 && Math.random() < 0.1) {
            const offspring = new Organism(
                `${this.name}-offspring`,
                this.type,
                {
                    ...this.traits,
                    growthRate: this.traits.growthRate * (0.9 + Math.random() * 0.2),
                    resourceConsumption: this.traits.resourceConsumption * (0.9 + Math.random() * 0.2),
                    resilience: this.traits.resilience * (0.9 + Math.random() * 0.2)
                },
                ecosystem.canvas
            );
            
            // Send new organism to server
            fetch('/api/organisms', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: offspring.name,
                    type: offspring.type,
                    traits: offspring.traits
                })
            }).then(() => {
                ecosystem.organisms.push(offspring);
                this.energy -= 50;
            }).catch(error => console.error('Error creating offspring:', error));
        }
    }

    die() {
        const isDead = this.energy <= 0 || this.age > 1000;
        if (isDead) {
            // Notify server about organism death
            fetch(`/api/organisms/${this.name}`, {
                method: 'DELETE'
            }).catch(error => console.error('Error deleting organism:', error));
        }
        return isDead;
    }

    draw(ctx) {
        // Enhanced visualization
        ctx.beginPath();
        ctx.arc(this.position.x, this.position.y, this.size + (this.energy / 20), 0, Math.PI * 2);
        
        // Color based on health
        const healthPercent = this.energy / 100;
        let color;
        
        switch(this.type) {
            case 'producer':
                color = `rgb(0, ${Math.floor(200 * healthPercent)}, 0)`;
                break;
            case 'consumer':
                color = `rgb(${Math.floor(200 * healthPercent)}, 0, 0)`;
                break;
            case 'decomposer':
                color = `rgb(${Math.floor(139 * healthPercent)}, ${Math.floor(69 * healthPercent)}, 19)`;
                break;
        }
        
        ctx.fillStyle = color;
        ctx.fill();
        
        // Draw name label
        ctx.fillStyle = 'black';
        ctx.font = '10px Arial';
        ctx.fillText(this.name, this.position.x + this.size, this.position.y);
        
        ctx.closePath();
    }
}

class EcosystemSimulation {
    constructor() {
        this.authService = new AuthService();
        this.initialize();
        this.canvas = document.getElementById('ecosystem-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.organisms = [];
        this.running = false;
        
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        
        this.setupEventListeners();
        this.setupFormHandling();
        this.stats = {
            populationHistory: [],
            environmentHistory: [],
            speciesDistribution: {}
        };
        this.setupAnalytics();
        this.environmentalCycles = {
            time: 0,
            dayLength: 1000, // milliseconds
            seasonLength: 4000 // milliseconds
        };

        this.authManager = new AuthManager();
        this.apiClient = new APIClient(this.authManager);
        this.initialize();
    }

    async initialize() {
        if (!this.authService.isAuthenticated()) {
            await this.authService.login();
        }
        try {
            await this.authManager.authenticate();
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
        document.getElementById('organism-form').addEventListener('submit', (e) => {
            e.preventDefault();
            
            const organism = new Organism(
                document.getElementById('name').value,
                document.getElementById('type').value,
                {
                    growthRate: parseInt(document.getElementById('growth-rate').value),
                    resourceConsumption: parseInt(document.getElementById('resource-consumption').value),
                    resilience: parseInt(document.getElementById('resilience').value)
                },
                this.canvas  // Pass canvas reference
            );
            
            this.organisms.push(organism);
            
            // Send to server
            fetch('/api/organisms', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(organism)
            });
        });
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
            const response = await fetch('/api/ecosystem', {
                method: 'PUT',
                headers: this.authService.getHeaders(),
                body: JSON.stringify({
                    temperature: Math.sin(this.environmentalCycles.time * Math.PI / 180) * 15 + 25,
                    humidity: 60 + Math.sin(this.environmentalCycles.time * Math.PI / 180) * 20,
                    pH: 7 + Math.sin(this.environmentalCycles.time * Math.PI / 180) * 0.5,
                    resources: {
                        light: Math.sin(this.environmentalCycles.time * Math.PI / 180) * 500 + 500,
                        water: 1000,
                        nutrients: 1000
                    }
                })
            });
            if (!response.ok) throw new Error('Failed to update environment');
        } catch (error) {
            console.error('Error updating environment:', error);
            this.pause();
        }
    }

    async update() {
        if (!this.running) return;
        
        this.clear();
        await this.updateEnvironment();
        
        try {
            const ecosystem = await this.apiClient.request('/api/ecosystem', {
                method: 'GET'
            });
            
            this.organisms = this.organisms.filter(organism => !organism.die());
            for (const organism of this.organisms) {
                await organism.update(ecosystem);
                organism.draw(this.ctx);
            }
            
            this.updateStats(ecosystem);
        } catch (error) {
            console.error('Error updating simulation:', error);
            this.pause();
        }
        
        requestAnimationFrame(() => this.update());
    }

    updateStats(ecosystem) {
        document.getElementById('temperature').textContent = `Temperature: ${ecosystem.temperature}°C`;
        document.getElementById('humidity').textContent = `Humidity: ${ecosystem.humidity}%`;
        document.getElementById('pH').textContent = `pH: ${ecosystem.pH}`;
        document.getElementById('resources').textContent = `Resources: ${ecosystem.resources.nutrients}`;
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
    new EcosystemSimulation();
});