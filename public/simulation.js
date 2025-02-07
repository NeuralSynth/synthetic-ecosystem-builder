// public/simulation.js
class Organism {
    constructor(name, type, traits) {
        this.name = name;
        this.type = type;
        this.traits = traits;
        this.position = {
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height
        };
        this.energy = 100;
        this.age = 0;
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
    }

    decompose(ecosystem) {
        // Implement decomposition mechanics
    }

    handleEnvironmentalEffects(ecosystem) {
        // Implement environmental impact on organism
        const tempEffect = Math.abs(25 - ecosystem.temperature) / this.traits.resilience;
        this.energy -= tempEffect;
    }

    draw(ctx) {
        ctx.beginPath();
        ctx.arc(this.position.x, this.position.y, 5 + (this.energy / 20), 0, Math.PI * 2);
        
        switch(this.type) {
            case 'producer':
                ctx.fillStyle = 'green';
                break;
            case 'consumer':
                ctx.fillStyle = 'red';
                break;
            case 'decomposer':
                ctx.fillStyle = 'brown';
                break;
        }
        
        ctx.fill();
        ctx.closePath();
    }
}

class EcosystemSimulation {
    constructor() {
        this.canvas = document.getElementById('ecosystem-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.organisms = [];
        this.running = false;
        
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        
        this.setupEventListeners();
        this.setupFormHandling();
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
                }
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

    update() {
        if (!this.running) return;
        
        this.clear();
        
        // Update ecosystem state
        fetch('/api/ecosystem')
            .then(response => response.json())
            .then(ecosystem => {
                // Update and draw organisms
                this.organisms.forEach(organism => {
                    organism.update(ecosystem);
                    organism.draw(this.ctx);
                });
                
                // Update stats display
                this.updateStats(ecosystem);
            });
        
        requestAnimationFrame(() => this.update());
    }

    updateStats(ecosystem) {
        document.getElementById('temperature').textContent = `Temperature: ${ecosystem.temperature}°C`;
        document.getElementById('humidity').textContent = `Humidity: ${ecosystem.humidity}%`;
        document.getElementById('pH').textContent = `pH: ${ecosystem.pH}`;
        document.getElementById('resources').textContent = `Resources: ${ecosystem.resources.nutrients}`;
    }
}

// Initialize simulation when page loads
document.addEventListener('DOMContentLoaded', () => {
    new EcosystemSimulation();
});