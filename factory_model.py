class FactoryModel:
    def __init__(self, data):
        self.inventory = data.get('inventory', [])
        self.assembly_stations = data.get('assembly_stations', [])
        self.connections = data.get('connections', [])

    def to_json(self):
        return {
            "assembly_sequence": self.generate_assembly_sequence(),
            "factory_scenario": self.generate_factory_scenario()
        }

    def generate_assembly_sequence(self):
        # Sort stations by their vertical position (assuming each station has a 'y' attribute)
        sorted_stations = sorted(self.assembly_stations, key=lambda s: float(s.get('y', 0)))
        
        # Group stations by their vertical position
        grouped_stations = []
        current_group = []
        current_y = None
        
        for station in sorted_stations:
            station_y = float(station.get('y', 0))
            if current_y is None or abs(station_y - current_y) < 10:  # Allow small vertical differences
                current_group.append(station['name'])
                current_y = station_y
            else:
                if current_group:
                    grouped_stations.append(current_group)
                current_group = [station['name']]
                current_y = station_y
        
        if current_group:
            grouped_stations.append(current_group)
        
        return grouped_stations
    
    def generate_factory_scenario(self):
        scenario = {}
        for station in self.assembly_stations:
            inventory_input_items = {}
            wip_input_items = {}
            for connection in self.connections:
                if connection['to'] == station['name']:
                    quantity = int(connection.get('quantity', 1))
                    if connection['from'] in self.inventory:
                        inventory_input_items[connection['from']] = quantity
                    else:
                        wip_input_items[self.get_output_item(connection['from'])] = quantity
            
            scenario[station['name']] = {
                "name": station['name'],
                "inventory_input_items": inventory_input_items if inventory_input_items else None,
                "WIP_input_items": wip_input_items if wip_input_items else None,
                "output_item": station['outputName'],
                "base_processing_time": float(station['processingTime']),
                "complexity": float(station['complexity']),
                "processing_capacity": int(station['processingCapacity'])  # Add this line
            }
        return scenario

    def get_output_item(self, station_name):
        for station in self.assembly_stations:
            if station['name'] == station_name:
                return station['outputName']
        return None