// json-handler.js

export function setupJSONHandling() {
    return {
        async uploadJSON() {
            const fileInput = document.getElementById('jsonFileInput');
            const file = fileInput.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const jsonData = JSON.parse(e.target.result);
                        this.loadFactoryFromJSON(jsonData);
                    } catch (error) {
                        console.error("Error parsing JSON:", error);
                        this.showAlert("Error parsing JSON file. Please ensure it's a valid factory design JSON.", "danger");
                    }
                };
                reader.readAsText(file);
            } else {
                this.showAlert("Please select a JSON file to upload.", "warning");
            }
        },
        loadFactoryFromJSON(jsonData) {
            console.log("Loading factory from JSON:", jsonData);

            this.inventory = [];
            this.assemblyStations = [];
            this.connections = [];

            if (jsonData.factory_scenario) {
                const inventorySet = new Set();
                for (const station of Object.values(jsonData.factory_scenario)) {
                    if (station.inventory_input_items) {
                        Object.keys(station.inventory_input_items).forEach(item => inventorySet.add(item));
                    }
                }
                this.inventory = Array.from(inventorySet);
            }

            if (jsonData.factory_scenario) {
                this.assemblyStations = Object.values(jsonData.factory_scenario).map(station => ({
                    name: station.name,
                    processingTime: station.base_processing_time,
                    outputName: station.output_item,
                    processingCapacity: station.processing_capacity,
                    complexity: station.complexity,
                    height: this.calculateStationHeight(station.base_processing_time),
                    x: 0,
                    y: 0
                }));
            }

            console.log("Loaded assembly stations:", this.assemblyStations);

            if (jsonData.assembly_sequence) {
                console.log("Assembly sequence:", jsonData.assembly_sequence);
                const baseY = 100;
                const yGap = 150;
                const xGap = 200;

                jsonData.assembly_sequence.forEach((row, rowIndex) => {
                    const y = baseY + rowIndex * yGap;
                    row.forEach((stationName, colIndex) => {
                        const station = this.assemblyStations.find(s => s.name === stationName);
                        if (station) {
                            const x = 50 + colIndex * xGap;
                            station.x = x;
                            station.y = y;
                            console.log(`Positioned station ${station.name} at (${x}, ${y})`);
                        } else {
                            console.warn(`Station ${stationName} not found in assembly stations`);
                        }
                    });
                });
            }

            console.log("Assembly stations after positioning:", this.assemblyStations);

            if (jsonData.factory_scenario) {
                for (const station of Object.values(jsonData.factory_scenario)) {
                    if (station.inventory_input_items) {
                        Object.entries(station.inventory_input_items).forEach(([item, quantity]) => {
                            this.connections.push({
                                from: item,
                                to: station.name,
                                quantity: quantity
                            });
                        });
                    }
                    if (station.WIP_input_items) {
                        Object.entries(station.WIP_input_items).forEach(([item, quantity]) => {
                            const fromStation = this.assemblyStations.find(s => s.outputName === item);
                            if (fromStation) {
                                this.connections.push({
                                    from: fromStation.name,
                                    to: station.name,
                                    quantity: quantity
                                });
                            }
                        });
                    }
                }
            }

            this.$nextTick(() => {
                this.inventory.forEach((item, index) => {
                    const inventoryElement = document.getElementById('inv-' + item);
                    if (inventoryElement) {
                        const x = 50 + index * 150;
                        const y = 50;
                        inventoryElement.setAttribute('data-x', x);
                        inventoryElement.setAttribute('data-y', y);
                        inventoryElement.style.transform = `translate(${x}px, ${y}px)`;
                    }
                });

                this.assemblyStations.forEach(station => {
                    const stationElement = document.getElementById(station.name);
                    if (stationElement) {
                        console.log(`Positioning station ${station.name} at (${station.x}, ${station.y})`);
                        stationElement.setAttribute('data-x', station.x);
                        stationElement.setAttribute('data-y', station.y);
                        stationElement.style.transform = `translate(${station.x}px, ${station.y}px)`;
                    } else {
                        console.warn(`Element for station ${station.name} not found`);
                    }
                });

                this.setupDragAndDrop();
                this.drawConnections();
            });

            this.showAlert("Factory design loaded successfully!", "success");
        },
        async generateFactory() {
            try {
                const response = await axios.post("/create_factory", {
                    inventory: this.inventory,
                    assembly_stations: this.assemblyStations.map(station => ({
                        ...station,
                        y: parseFloat(document.getElementById(station.name).getAttribute('data-y') || '0')
                    })),
                    connections: this.connections,
                }, {
                    responseType: 'blob'
                });
                
                const blob = new Blob([response.data], { type: 'application/json' });
                const link = document.createElement('a');
                link.href = window.URL.createObjectURL(blob);
                link.download = 'factory_design.json';
                link.click();
                
                window.URL.revokeObjectURL(link.href);
                
                this.showAlert("Factory design JSON has been downloaded.", "success");
            } catch (error) {
                console.error("Error generating factory:", error);
                this.showAlert("Error generating factory. Please check the console for details.", "danger");
            }
        },

        async saveWorkers() {
            try {
                const response = await axios.post("/save_workers", {
                    workers: this.workers,
                    distribution: this.workerDefinition.skillDistribution
                }, {
                    responseType: 'blob'
                });
                
                // Create a Blob from the response data
                const blob = new Blob([response.data], { type: 'application/json' });
                
                // Create a link element and trigger the download
                const link = document.createElement('a');
                link.href = window.URL.createObjectURL(blob);
                link.download = 'workers.json';
                link.click();
                
                // Clean up
                window.URL.revokeObjectURL(link.href);
                
                this.$emit('show-alert', {
                    message: "Workers JSON has been downloaded.",
                    type: "success"
                });
            } catch (error) {
                console.error("Error saving workers:", error);
                this.$emit('show-alert', {
                    message: "Error saving workers. Please check the console for details.",
                    type: "danger"
                });
            }
        },
        normalDistribution(mean, stdDev) {
            // Box-Muller transform for normal distribution
            const u1 = Math.random();
            const u2 = Math.random();
            const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
            return z0 * stdDev + mean;
        },
    };
}