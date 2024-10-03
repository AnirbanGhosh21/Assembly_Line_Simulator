from flask import Flask, render_template, request, jsonify, send_file
from factory_model import FactoryModel
# from factory_simulation import simulate_factory
import os
import json
from io import BytesIO
from factory_classes import Factory
import simpy

app = Flask(__name__, static_folder='static', static_url_path='/static')

@app.route('/')
def index():
    initial_data = {
        'newStation': {
            'name': '',
            'processingTime': '',
            'outputName': '',
            'complexity': 0.5
        }
    }
    return render_template('index.html', **initial_data)

@app.route('/create_factory', methods=['POST'])
def create_factory():
    data = request.json
    factory = FactoryModel(data)
    factory_json = factory.to_json()
    
    # Create a BytesIO object
    binary_io = BytesIO()
    
    # Write the JSON to the BytesIO object
    binary_io.write(json.dumps(factory_json, indent=2).encode('utf-8'))
    
    # Seek to the beginning of the BytesIO object
    binary_io.seek(0)
    
    # Send the file
    return send_file(
        binary_io,
        mimetype='application/json',
        as_attachment=True,
        download_name='factory_design.json'
    )

@app.route('/upload_json', methods=['POST'])
def upload_json():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    if file and file.filename.endswith('.json'):
        try:
            json_data = json.load(file)
            return jsonify(json_data), 200
        except json.JSONDecodeError:
            return jsonify({'error': 'Invalid JSON file'}), 400
    else:
        return jsonify({'error': 'File must be a JSON file'}), 400
    
@app.route('/save_workers', methods=['POST'])
def save_workers():
    data = request.json
    workers_json = {
        "workers": data['workers'],
        "distribution": data['distribution']
    }
    
    # Create a BytesIO object
    binary_io = BytesIO()
    
    # Write the JSON to the BytesIO object
    binary_io.write(json.dumps(workers_json, indent=2).encode('utf-8'))
    
    # Seek to the beginning of the BytesIO object
    binary_io.seek(0)
    
    # Send the file
    return send_file(
        binary_io,
        mimetype='application/json',
        as_attachment=True,
        download_name='workers.json'
    )

@app.route('/run_simulation', methods=['POST'])
def run_simulation():
    data = request.json
    factory_data = {
        "assembly_sequence": data['assembly_sequence'],
        "factory_scenario": data['factory_scenario']
    }
    workers_data = {
        "workers": data['workers'],
        "distribution": data['worker_distribution']
    }
    demand = data['demand']

    env = simpy.Environment()
    factory = Factory(env, factory_data, workers_data['workers'], demand)

    def check_production():
        first_run_complete = False
        while True:
            if factory.final_products.level > 0 and not first_run_complete:
                first_run_complete = True
            
            if first_run_complete and factory.all_stations_inactive():
                return env.now
            
            yield env.timeout(0.1)

    factory.start_production()
    end_time = env.process(check_production())
    
    env.run(until=end_time)

    simulation_results = {
        "simulation_time": env.now,
        "products_produced": factory.final_products.level,
        "max_wip_levels": factory.get_max_wip_levels(),
        "total_wips_produced": factory.get_total_wips_produced(),
        "scrap_counts": factory.get_scrap_rework_counts()[0],
        "rework_counts": factory.get_scrap_rework_counts()[1],
        "station_active_times": factory.get_station_active_times()
    }

    return jsonify(simulation_results)

if __name__ == '__main__':
    app.run(debug=True)