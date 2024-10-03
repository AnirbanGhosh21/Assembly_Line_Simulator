import simpy
import random
from collections import defaultdict

class Worker:
    def __init__(self, skill):
        self.skill = skill

    def calculate_processing_time(self, base_time, complexity):
        return base_time * (1 + complexity * (1 - self.skill))

    def check_scrap(self, complexity):
        scrap_chance = 0.1 * complexity * (1 - self.skill)
        return random.random() < scrap_chance

    def check_rework(self, complexity):
        rework_chance = 0.2 * complexity * (1 - self.skill)
        return random.random() < rework_chance

class Station:
    def __init__(self, env, name, data, inventory, wip_storage, scrap_storage, rework_storage, final_products, final_part):
        self.env = env
        self.name = name
        self.data = data
        self.inventory = inventory
        self.wip_storage = wip_storage
        self.scrap_storage = scrap_storage
        self.rework_storage = rework_storage
        self.final_products = final_products
        self.final_part = final_part
        self.resource = simpy.Resource(env, capacity=data['processing_capacity'])
        self.is_active = False
        self.wips_produced = 0
        self.scrap_count = 0
        self.rework_count = 0
        self.active_start_time = 0
        self.total_active_time = 0

    def process(self, worker):
        base_time = self.data['base_processing_time']
        complexity = self.data['complexity']
        output_item = self.data['output_item']

        if worker.check_scrap(complexity):
            print(f"{self.env.now:.2f}: Scrap occurred at {self.name}")
            self.scrap_storage[output_item].put(1)
            self.scrap_count += 1
            return None

        processing_time = worker.calculate_processing_time(base_time, complexity)

        if worker.check_rework(complexity):
            processing_time *= 1.3
            print(f"{self.env.now:.2f}: Rework needed at {self.name}")
            self.rework_storage[output_item].put(1)
            self.rework_count += 1

        yield self.env.timeout(processing_time)

        print(f"{self.env.now:.2f}: Completed {self.name}")
        self.wips_produced += 1
        return output_item

    def run(self, worker):
        while True:
            self.is_active = False
            
            if self.data['inventory_input_items']:
                for item, quantity in self.data['inventory_input_items'].items():
                    yield self.inventory[item].get(quantity)

            if self.data['WIP_input_items']:
                for item, quantity in self.data['WIP_input_items'].items():
                    if item != 'null':
                        yield self.wip_storage[item].get(quantity)
            
            self.is_active = True
            self.active_start_time = self.env.now

            with self.resource.request() as req:
                yield req

                result = yield self.env.process(self.process(worker))

                self.total_active_time += self.env.now - self.active_start_time

                if result:
                    if result == self.final_part:
                        yield self.final_products.put(1)
                    else:
                        yield self.wip_storage[result].put(1)

class Factory:
    def __init__(self, env, factory_data, workers, demand):
        self.env = env
        self.assembly_sequence = factory_data['assembly_sequence']
        self.scenario = factory_data['factory_scenario']
        self.workers = [Worker(w['skill']) for w in workers]
        self.demand = demand
        
        final_station = self.assembly_sequence[-1][0]
        self.final_part = self.scenario[final_station]['output_item']
        
        inventory, WIPs, scrap, rework = self.calculate_inventory(factory_data, demand)
        
        self.inventory = {item: simpy.Container(env, init=quantity) for item, quantity in inventory.items()}
        self.wip_storage = {item: simpy.Container(env, init=quantity) for item, quantity in WIPs.items()}
        self.scrap_storage = {item: simpy.Container(env, init=quantity) for item, quantity in scrap.items()}
        self.rework_storage = {item: simpy.Container(env, init=quantity) for item, quantity in rework.items()}
        self.final_products = simpy.Container(env, init=0)

        self.stations = {name: Station(env, name, data, self.inventory, self.wip_storage, 
                                       self.scrap_storage, self.rework_storage, self.final_products, self.final_part) 
                         for name, data in self.scenario.items()}
        self.max_wip_levels = {item: 0 for item in self.wip_storage.keys()}
        self.WIPs_produced = {item: 0 for item in self.wip_storage.keys()}
        self.env.process(self.track_max_wip_levels())
        self.scrap_counts = {name: 0 for name in self.scenario.keys()}
        self.rework_counts = {name: 0 for name in self.scenario.keys()}
        self.station_active_times = defaultdict(float)

    @staticmethod
    def calculate_inventory(factory_design, demand):
        inventory = defaultdict(int)
        WIPs = defaultdict(int)
        scrap = defaultdict(int)
        rework = defaultdict(int)

        for station_name, values in factory_design['factory_scenario'].items():
            station_capacity = values['processing_capacity']
            for param_name, param in values['inventory_input_items'].items():
                inventory[param_name] += (param * demand * station_capacity)
            
            output_item = values['output_item']
            WIPs[output_item] = 0
            scrap[output_item] = 0
            rework[output_item] = 0

        return dict(inventory), dict(WIPs), dict(scrap), dict(rework)

    def get_station_active_times(self):
        for station_name, station in self.stations.items():
            if station.is_active:
                self.station_active_times[station_name] = station.total_active_time + (self.env.now - station.active_start_time)
            else:
                self.station_active_times[station_name] = station.total_active_time
        return dict(self.station_active_times)

    def get_scrap_rework_counts(self):
        for station_name, station in self.stations.items():
            self.scrap_counts[station_name] = station.scrap_count
            self.rework_counts[station_name] = station.rework_count
        return self.scrap_counts, self.rework_counts

    def track_max_wip_levels(self):
        while True:
            for item, container in self.wip_storage.items():
                self.max_wip_levels[item] = max(self.max_wip_levels[item], container.level)
            yield self.env.timeout(0.1)

    def get_max_wip_levels(self):
        return self.max_wip_levels
    
    def get_total_wips_produced(self):
        return {station.name: station.wips_produced for station in self.stations.values()}
    
    def run_station(self, station_name):
        while True:
            worker = random.choice(self.workers)
            yield self.env.process(self.stations[station_name].run(worker))

    def start_production(self):
        for stage in self.assembly_sequence:
            for station_name in stage:
                self.env.process(self.run_station(station_name))
        
    def all_stations_inactive(self):
        return all(not station.is_active for station in self.stations.values())