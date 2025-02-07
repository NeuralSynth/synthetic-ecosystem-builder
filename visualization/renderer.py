import pyglet
import trimesh
import numpy as np

class EcosystemRenderer:
    def __init__(self, width=800, height=600):
        self.window = pyglet.window.Window(width, height)
        self.batch = pyglet.graphics.Batch()
        self.organisms = {}
        
    def create_organism(self, organism_data):
        """Create 3D representation of an organism"""
        x = organism_data.get('position', {}).get('x', 0)
        y = organism_data.get('position', {}).get('y', 0)
        size = organism_data.get('size', 5)
        
        sprite = pyglet.shapes.Circle(
            x, y, size,
            color=self._get_color(organism_data),
            batch=self.batch
        )
        self.organisms[organism_data['id']] = sprite
        
    def _get_color(self, organism_data):
        """Calculate organism color based on its state"""
        energy = organism_data.get('energy', 100)
        if energy > 75:
            return (50, 205, 50)  # Healthy green
        elif energy > 25:
            return (255, 165, 0)  # Warning orange
        else:
            return (220, 20, 60)  # Critical red
            
    def update(self, ecosystem_data):
        """Update visualization with new ecosystem state"""
        for organism_id, sprite in self.organisms.items():
            if organism_id in ecosystem_data['organisms']:
                org_data = ecosystem_data['organisms'][organism_id]
                sprite.x = org_data['position']['x']
                sprite.y = org_data['position']['y']
                sprite.color = self._get_color(org_data)
                
    def run(self):
        """Start the visualization"""
        pyglet.app.run()