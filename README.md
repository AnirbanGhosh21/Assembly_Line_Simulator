# FlowForge

FlowForge is a web-based factory simulation and optimization tool that allows users to design, configure, and simulate complex manufacturing processes.

## Features

- **Visual Factory Design**: Drag-and-drop interface for creating factory layouts with inventory items and assembly stations.
- **Connection Management**: Define and visualize connections between inventory items and assembly stations.
- **Worker Configuration**: Set up worker profiles with customizable skill distributions.
- **Simulation Engine**: Run simulations based on your factory design and worker configuration.
- **Performance Analysis**: View detailed simulation results, including production metrics, WIP levels, and station performance.
- **JSON Import/Export**: Save and load factory designs for easy sharing and iteration.

## Getting Started

1. Clone the repository:
   ```
   git clone https://github.com/AnirbanGhosh21/flowforge.git
   ```

2. Install dependencies:
   ```
   pip install -r requirements.txt
   ```

3. Run the application:
   ```
   python app.py
   ```

4. Open your web browser and navigate to `http://localhost:5000` to access the FlowForge interface.

## Usage

1. **Design Your Factory**:
   - Add inventory items and assembly stations using the toolbar.
   - Drag and position elements on the factory floor.
   - Create connections between items and stations.

2. **Configure Workers**:
   - Set the number of workers and their skill distribution.

3. **Run Simulation**:
   - Set the demand for your factory.
   - Click "Run Simulation" to start the process.

4. **Analyze Results**:
   - View detailed simulation results, including production metrics, WIP levels, and station performance.

## Contributing

We welcome contributions to FlowForge! Please read our [Contributing Guide](CONTRIBUTING.md) for more information on how to get started.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Thanks to all contributors who have helped shape FlowForge.
- Built with Flask, Vue.js, and SimPy.