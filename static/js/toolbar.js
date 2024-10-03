// toolbar.js

export function setupToolbar() {
    return {
        addConnection() {
            if (this.newConnection.from && this.newConnection.to && this.newConnection.quantity > 0) {
                this.connections.push({ ...this.newConnection });
                this.newConnection = { from: "", to: "", quantity: 1 };
                this.$nextTick(() => {
                    this.drawConnections();
                });
            }
        },
        deleteConnection(index) {
            this.connections.splice(index, 1);
            this.$nextTick(() => {
                this.drawConnections();
            });
        },
        showAlert(message, type = 'info') {
            const alertContainer = document.getElementById('alert-container');
            const alertElement = document.createElement('div');
            alertElement.className = `alert alert-${type} alert-dismissible fade show`;
            alertElement.role = 'alert';
            alertElement.innerHTML = `
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            `;
            alertContainer.appendChild(alertElement);

            setTimeout(() => {
                alertElement.classList.remove('show');
                setTimeout(() => alertElement.remove(), 150);
            }, 5000);
        },
        
        runSimulation() {
            if (this.assemblyStations.length === 0 || this.workers.length === 0 || !this.demand) {
                this.showAlert("Please set up the factory, workers, and demand before running the simulation.", "warning");
                return;
            }

            this.simulationRunning = true;
            
            // Prepare the data for the simulation
            const simulationData = {
                assembly_sequence: this.generateAssemblySequence(),
                factory_scenario: this.generateFactoryScenario(),
                workers: this.workers,
                worker_distribution: this.workerDefinition.skillDistribution,
                demand: this.demand
            };

            axios.post("/run_simulation", simulationData)
                .then(response => {
                    this.simulationResults = response.data;
                    this.showAlert("Simulation completed successfully!", "success");
                    
                    this.$nextTick(() => {
                        this.createStationMetricsCards();
                        this.drawConnections();

                        // Open the simulation results accordion
                        const simulationResultsCollapse = new bootstrap.Collapse(document.getElementById('simulationResultsCollapse'), {
                            toggle: false
                        });
                        simulationResultsCollapse.show();
                    });
                })
                .catch(error => {
                    console.error("Error running simulation:", error);
                    this.showAlert("Error running simulation. Please check the console for details.", "danger");
                })
                .finally(() => {
                    this.simulationRunning = false;
                });
        },

        generateAssemblySequence() {
            // Sort stations by their vertical position
            const sortedStations = [...this.assemblyStations].sort((a, b) => {
                const aElement = document.getElementById(a.name);
                const bElement = document.getElementById(b.name);
                return (aElement.getAttribute('data-y') || 0) - (bElement.getAttribute('data-y') || 0);
            });

            // Group stations by their vertical position
            const groupedStations = [];
            let currentGroup = [];
            let currentY = null;

            sortedStations.forEach(station => {
                const stationElement = document.getElementById(station.name);
                const stationY = parseFloat(stationElement.getAttribute('data-y') || 0);

                if (currentY === null || Math.abs(stationY - currentY) < 10) {
                    currentGroup.push(station.name);
                    currentY = stationY;
                } else {
                    if (currentGroup.length > 0) {
                        groupedStations.push(currentGroup);
                    }
                    currentGroup = [station.name];
                    currentY = stationY;
                }
            });

            if (currentGroup.length > 0) {
                groupedStations.push(currentGroup);
            }

            return groupedStations;
        },

        generateFactoryScenario() {
            const scenario = {};
            this.assemblyStations.forEach(station => {
                const inventoryInputItems = {};
                const wipInputItems = {};

                this.connections.forEach(connection => {
                    if (connection.to === station.name) {
                        const quantity = connection.quantity;
                        if (this.inventory.includes(connection.from)) {
                            inventoryInputItems[connection.from] = quantity;
                        } else {
                            const fromStation = this.assemblyStations.find(s => s.name === connection.from);
                            if (fromStation) {
                                wipInputItems[fromStation.outputName] = quantity;
                            }
                        }
                    }
                });

                scenario[station.name] = {
                    name: station.name,
                    inventory_input_items: inventoryInputItems,  // Remove the null check
                    WIP_input_items: wipInputItems,  // Remove the null check
                    output_item: station.outputName,
                    base_processing_time: parseFloat(station.processingTime),
                    complexity: parseFloat(station.complexity),
                    processing_capacity: parseInt(station.processingCapacity)
                };
            });

            return scenario;
        },

        defineWorkers() {
            const count = this.workerDefinition.count;
            const distribution = this.workerDefinition.skillDistribution;
            
            // Generate workers based on the distribution
            this.workers = Array.from({length: count}, () => {
                let skill;
                if (distribution === 0) {
                    // Biased towards 0
                    skill = Math.random() * Math.random();
                } else if (distribution === 1) {
                    // Biased towards 1
                    skill = 1 - Math.random() * Math.random();
                } else {
                    // Normal distribution
                    skill = this.normalDistribution(0.5, 0.15);
                    skill = Math.max(0, Math.min(1, skill)); // Clamp between 0 and 1
                }
                return { skill: parseFloat(skill.toFixed(2)) };
            });

            // Save workers to a separate file
            this.saveWorkers();

            this.$emit('show-alert', {
                message: `Defined ${count} workers with skill distribution ${distribution}`,
                type: "success"
            });
        },
    };
}