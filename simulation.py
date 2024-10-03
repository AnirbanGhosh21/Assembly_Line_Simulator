import simpy
import json
from factory_classes import Factory
import os

def load_data(factory, worker):
    with open(factory, 'r') as f:
        factory_design = json.load(f)
    with open(worker, 'r') as f:
        workers_data = json.load(f)
    return factory_design, workers_data

def run_simulation(factory_data, worker_data, demand, result_loc, factory_sceanrio_name):
    env = simpy.Environment()
    factory = Factory(env, factory_data, worker_data['workers'], demand)

    def check_production():
        first_run_complete = False
        while True:
            if factory.final_products.level > 0 and not first_run_complete:
                first_run_complete = True
                print(f"\n{env.now:.2f}: First product completed. Starting to check for inactive condition.")
            
            if first_run_complete and factory.all_stations_inactive():
                return env.now
            
            yield env.timeout(0.1)

    factory.start_production()
    end_time = env.process(check_production())
    
    env.run(until=end_time)

    print(f"\nSimulation completed at {env.now:.2f}")
    print(f"Final products produced: {factory.final_products.level}")
    print(f"Demand: {factory.demand}")

    max_wip_levels = factory.get_max_wip_levels()
    total_wips_produced = factory.get_total_wips_produced()
    scrap_counts, rework_counts = factory.get_scrap_rework_counts()
    station_active_times = factory.get_station_active_times()
    
    return env.now, factory.final_products.level, max_wip_levels, total_wips_produced, scrap_counts, rework_counts, station_active_times, factory_data, worker_data, result_loc, factory_sceanrio_name

def print_simulation_results(simulation_time, products_produced, max_wip_levels, total_wips_produced, scrap_counts, rework_counts, station_active_times, factory_data, worker_data, result_loc, factory_sceanrio_name):
    def create_station_tree(station_name, assembly_sequence, factory_scenario):
        station_data = factory_scenario[station_name]
        features = []
        feature_names = []
        
        for item, quantity in station_data['inventory_input_items'].items():
            features.append(quantity)
            feature_names.append(item)
        
        for item, quantity in station_data['WIP_input_items'].items():
            if item != 'null':
                features.append(quantity)
                feature_names.append(item)
        
        output = {
            'Total_WIPs_produced': total_wips_produced.get(station_name, 0),
            'total_rework_produced': rework_counts.get(station_name, 0),
            'total_scrap_produced': scrap_counts.get(station_name, 0),
            'station_Active_time': station_active_times.get(station_name, 0),
            'throughput': total_wips_produced.get(station_name, 0) / simulation_time if simulation_time > 0 else 0,
            'maximum_WIP_level': max_wip_levels.get(station_data['output_item'], None)
        }
        
        children = []
        for stage in assembly_sequence:
            if station_name in stage:
                index = assembly_sequence.index(stage)
                if index > 0:
                    children = [create_station_tree(s, assembly_sequence, factory_scenario) for s in assembly_sequence[index-1]]
                break
        
        return {
            "module_id": station_name,
            "module_name": station_name,
            "features": features,
            "feature_names": feature_names,
            "output": output,
            "total_output": None,
            "left_child_name": children[0]['module_name'] if len(children) > 0 else None,
            "right_child_name": children[1]['module_name'] if len(children) > 1 else None,
            "children": children
        }

    final_station = factory_data['assembly_sequence'][-1][0]
    json_tree = create_station_tree(final_station, factory_data['assembly_sequence'], factory_data['factory_scenario'])

    result = {
        "module_params_dict": None,
        "query_id": factory_sceanrio_name,  # You may want to make this dynamic
        "treatment_id": worker_data.get('distribution', 'unknown'),
        "json_tree": json_tree
    }

    # Save the result as a JSON file
    with open(result_loc, 'w') as f:
        json.dump(result, f, indent=2)

    print(f"Results saved to {result_loc}")

def list_files(directory):
    try:
        # Get the list of all files and directories in the given path
        files = os.listdir(directory)
        # Return the list of files
        return files
    except FileNotFoundError:
        print(f"Error: The directory '{directory}' does not exist.")
        return []
    except PermissionError:
        print(f"Error: You don't have permission to access the directory '{directory}'.")
        return []

if __name__ == "__main__":
    factory_scenarios = list_files('factory_scenarios')
    worker_scenarios = list_files('worker_config')
    os.makedirs('results', exist_ok=True)
    
    for worker_scenario in worker_scenarios:
        worker_scenario_name, extention = os.path.splitext(worker_scenario)
        os.makedirs(f'results/{worker_scenario_name}', exist_ok=True)
        for factory_sceanrio in factory_scenarios:
            factory_sceanrio_name, extention = os.path.splitext(factory_sceanrio)
            os.makedirs(f'results/{worker_scenario_name}/{factory_sceanrio_name}', exist_ok=True)
            for demand in range (100, 1000, 50):
                factory_data, worker_data = load_data(f'factory_scenarios/{factory_sceanrio}', f'worker_config/{worker_scenario}')
                result_loc = f'results/{worker_scenario_name}/{factory_sceanrio_name}/{factory_sceanrio_name}_{demand}.json'
                simulation_results = run_simulation(factory_data, worker_data, demand, result_loc,factory_sceanrio_name)
                print_simulation_results(*simulation_results)