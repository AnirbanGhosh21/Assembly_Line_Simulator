// factory-floor.js

export function setupFactoryFloor() {
    return {
        drawConnections() {
            const svg = document.getElementById("connections");
            svg.innerHTML = "";

            const factoryFloor = document.getElementById("factory-floor");
            const parentRect = factoryFloor.getBoundingClientRect();
            const scrollLeft = factoryFloor.scrollLeft;
            const scrollTop = factoryFloor.scrollTop;

            svg.setAttribute("width", parentRect.width);
            svg.setAttribute("height", parentRect.height);

            const computedStyle = getComputedStyle(document.documentElement);
            const bufferSize = parseFloat(computedStyle.getPropertyValue('--buffer-size'));

            // Remove existing WIP cards
            document.querySelectorAll('.wip-card').forEach(card => card.remove());

            this.connections.forEach((connection) => {
                const fromElement = document.getElementById(this.isInventoryItem(connection.from) ? 'inv-' + connection.from : connection.from);
                const toElement = document.getElementById(connection.to);

                if (fromElement && toElement) {
                    const fromRect = fromElement.getBoundingClientRect();
                    const toRect = toElement.getBoundingClientRect();

                    const fromX = fromRect.left - parentRect.left + scrollLeft + fromRect.width / 2;
                    const fromY = fromRect.top - parentRect.top + scrollTop + fromRect.height / 2;
                    const toX = toRect.left - parentRect.left + scrollLeft + toRect.width / 2;
                    const toY = toRect.top - parentRect.top + scrollTop + toRect.height / 2;

                    const midX = (fromX + toX) / 2;
                    const midY = (fromY + toY) / 2;
                    let controlX1, controlY1, controlX2, controlY2;

                    if (Math.abs(fromY - toY) < 1) {
                        controlX1 = fromX + (toX - fromX) / 3;
                        controlY1 = fromY;
                        controlX2 = fromX + 2 * (toX - fromX) / 3;
                        controlY2 = toY;
                    } else {
                        controlX1 = fromX;
                        controlY1 = midY;
                        controlX2 = toX;
                        controlY2 = midY;
                    }

                    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
                    path.setAttribute("d", `M ${fromX} ${fromY} C ${controlX1} ${controlY1}, ${controlX2} ${controlY2}, ${toX} ${toY}`);
                    
                    if (connection.from === 'worker-block') {
                        path.setAttribute("stroke-dasharray", "5,5");
                    } else if (!this.isInventoryItem(connection.from) && connection.from !== 'worker-block') {
                        const centerX = (fromX + controlX1 + controlX2 + toX) / 4;
                        const centerY = (fromY + controlY1 + controlY2 + toY) / 4;

                        const bufferCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
                        bufferCircle.setAttribute("cx", centerX);
                        bufferCircle.setAttribute("cy", centerY);
                        bufferCircle.setAttribute("r", bufferSize / 2);
                        svg.appendChild(bufferCircle);

                        // Create and add WIP card if simulation results exist
                        if (this.simulationResults && this.simulationResults.max_wip_levels) {
                            const fromStation = this.assemblyStations.find(s => s.name === connection.from);
                            if (fromStation) {
                                const wipLevel = this.simulationResults.max_wip_levels[fromStation.outputName] || 0;
                                const wipCard = this.createWipCard(centerX, centerY, wipLevel, connection.from, connection.to);
                                factoryFloor.appendChild(wipCard);
                            }
                        }
                    }
                    
                    svg.appendChild(path);
                }
            });

            // Position the station metrics cards
            this.assemblyStations.forEach(station => {
                const stationElement = document.getElementById(station.name);
                const metricsCard = document.getElementById(`metrics-${station.name}`);
                
                if (stationElement && metricsCard) {
                    const stationRect = stationElement.getBoundingClientRect();
                    const left = stationRect.left - parentRect.left + scrollLeft;
                    const top = stationRect.bottom - parentRect.top + scrollTop + 10; // 10px gap

                    metricsCard.style.left = `${left}px`;
                    metricsCard.style.top = `${top}px`;
                }
            });
        },

        createStationMetricsCards() {
            if (!this.simulationResults) return;

            this.assemblyStations.forEach(station => {
                const stationElement = document.getElementById(station.name);
                if (!stationElement) return;

                let metricsCard = document.getElementById(`metrics-${station.name}`);
                if (!metricsCard) {
                    metricsCard = document.createElement('div');
                    metricsCard.id = `metrics-${station.name}`;
                    metricsCard.className = 'card station-metrics';
                    metricsCard.style.position = 'absolute';
                    metricsCard.style.display = 'none';
                    document.getElementById('factory-floor').appendChild(metricsCard);
                }

                const metrics = this.simulationResults;
                metricsCard.innerHTML = `
                    <div class="card-header" role="tab">
                        <h5 class="mb-0">
                            <a data-bs-toggle="collapse" href="#collapse-${station.name}">
                                ${station.name} Metrics
                            </a>
                        </h5>
                    </div>
                    <div id="collapse-${station.name}" class="collapse" role="tabpanel">
                        <div class="card-body">
                            <p>WIPs Produced: ${metrics.total_wips_produced[station.name] || 0}</p>
                            <p>Scrap Count: ${metrics.scrap_counts[station.name] || 0}</p>
                            <p>Rework Count: ${metrics.rework_counts[station.name] || 0}</p>
                            <p>Active Time: ${(metrics.station_active_times[station.name] || 0).toFixed(2)}</p>
                        </div>
                    </div>
                `;

                metricsCard.style.display = 'block';
            });
        },

        createWipCard(x, y, wipLevel, fromStation, toStation) {
            const wipCard = document.createElement('div');
            wipCard.className = 'card wip-card';
            wipCard.style.position = 'absolute';
            wipCard.style.left = `${x}px`;
            wipCard.style.top = `${y}px`;
            wipCard.style.transform = 'translate(-50%, -50%)';
            wipCard.style.zIndex = '1000';
            wipCard.innerHTML = `
                <div class="card-body p-1">
                    <p class="card-text mb-0" style="font-size: 0.7rem;">Max WIP: ${wipLevel}</p>
                    <p class="card-text mb-0" style="font-size: 0.6rem;">${fromStation} → ${toStation}</p>
                </div>
            `;
            return wipCard;
        },

        showEditPopup(event, item) {
            event.preventDefault();
            const type = this.getItemType(item);
            let editItem = item;

            if (type === 'worker') {
                editItem = {
                    count: this.workerDefinition.count,
                    skillDistribution: this.workerDefinition.skillDistribution
                };
            }

            this.editPopup = {
                show: true,
                item: editItem,
                type: type
            };
        },

        hideEditPopup() {
            this.editPopup = { show: false, item: null, type: null };
        },

        saveEditedItem(editedItem) {
            const type = this.editPopup.type;
            if (type === 'inventory') {
                const index = this.inventory.indexOf(this.editPopup.item);
                this.$set(this.inventory, index, editedItem);
                this.updateConnections(this.editPopup.item, editedItem);
            } else if (type === 'station') {
                const index = this.assemblyStations.findIndex(s => s.name === this.editPopup.item.name);
                this.$set(this.assemblyStations, index, editedItem);
                this.updateConnections(this.editPopup.item.name, editedItem.name);
            } else if (type === 'worker') {
                this.workerDefinition = editedItem;
                this.createAndGenerateWorkers();
            }
            this.hideEditPopup();
            this.$nextTick(() => {
                this.drawConnections();
            });
        },

        deleteItem() {
            const type = this.editPopup.type;
            if (type === 'inventory') {
                const index = this.inventory.indexOf(this.editPopup.item);
                this.inventory.splice(index, 1);
            } else if (type === 'station') {
                const index = this.assemblyStations.findIndex(s => s.name === this.editPopup.item.name);
                this.assemblyStations.splice(index, 1);
            } else if (type === 'worker') {
                this.workerBlock = null;
                this.workers = [];
                this.connections = this.connections.filter(c => c.from !== 'worker-block');
            }
            this.connections = this.connections.filter(c => 
                c.from !== this.editPopup.item && c.to !== this.editPopup.item
            );
            this.hideEditPopup();
            this.$nextTick(() => {
                this.drawConnections();
            });
            this.$emit('show-alert', {
                message: `${this.editPopup.type} deleted successfully.`,
                type: "success"
            });
        },

        getItemType(item) {
            if (typeof item === 'string' && this.inventory.includes(item)) {
                return 'inventory';
            } else if (typeof item === 'object' && item.name) {
                return 'station';
            } else if (item === 'worker-block') {
                return 'worker';
            }
            return null;
        },

        showContextMenu(event, item) {
            event.preventDefault();
            const contextMenu = document.getElementById('context-menu');
            const factoryFloor = document.getElementById('factory-floor');
            const factoryRect = factoryFloor.getBoundingClientRect();

            let x = event.clientX - factoryRect.left;
            let y = event.clientY - factoryRect.top;

            // Adjust menu position if it would go off-screen
            const menuWidth = 200; // Approximate width of the context menu
            const menuHeight = 100; // Approximate height of the context menu

            if (x + menuWidth > factoryRect.width) {
                x = factoryRect.width - menuWidth;
            }
            if (y + menuHeight > factoryRect.height) {
                y = factoryRect.height - menuHeight;
            }

            this.contextMenu.show = true;
            this.contextMenu.x = x;
            this.contextMenu.y = y;
            this.contextMenu.target = item;

            this.$nextTick(() => {
                const dropdownMenu = contextMenu.querySelector('.dropdown-menu');
                dropdownMenu.classList.add('show');
            });
        },
        hideContextMenu() {
            this.contextMenu.show = false;
        },
        editBox() {
            const item = this.contextMenu.target;
            if (this.isInventoryItem(item)) {
                const newName = prompt("Enter new name for inventory item:", item);
                if (newName && newName !== item) {
                    const index = this.inventory.indexOf(item);
                    this.$set(this.inventory, index, newName);
                    this.updateConnections(item, newName);
                }
            } else {
                const station = this.assemblyStations.find(s => s.name === item);
                if (station) {
                    const newName = prompt("Enter new name for station:", station.name);
                    const newProcessingTime = prompt("Enter new processing time:", station.processingTime);
                    const newOutputName = prompt("Enter new output name:", station.outputName);
                    const newProcessingCapacity = prompt("Enter new processing capacity:", station.processingCapacity);
                    const newComplexity = prompt("Enter new complexity (0-1):", station.complexity);

                    if (newName) station.name = newName;
                    if (newProcessingTime) station.processingTime = parseFloat(newProcessingTime);
                    if (newOutputName) station.outputName = newOutputName;
                    if (newProcessingCapacity) station.processingCapacity = parseFloat(newProcessingCapacity);
                    if (newComplexity) station.complexity = parseFloat(newComplexity);

                    station.height = this.calculateStationHeight(station.processingTime);
                    this.updateConnections(item, newName);
                }
            }
            this.hideContextMenu();
            this.$nextTick(() => {
                this.drawConnections();
            });
        },


        deleteBox() {
            const item = this.contextMenu.target;
            if (this.isInventoryItem(item)) {
                const index = this.inventory.indexOf(item);
                this.inventory.splice(index, 1);
            } else if (item === 'worker-block') {
                // Handle worker block deletion
                this.workerBlock = null;
                this.workers = []; // Reset workers
                // Remove all connections from the worker block
                this.connections = this.connections.filter(c => c.from !== 'worker-block');
                this.$emit('show-alert', {
                    message: "Worker block deleted. You can now create a new worker block.",
                    type: "success"
                });
            } else {
                const index = this.assemblyStations.findIndex(s => s.name === item);
                if (index !== -1) {
                    this.assemblyStations.splice(index, 1);
                }
            }
            this.connections = this.connections.filter(c => c.from !== item && c.to !== item);
            this.hideContextMenu();
            this.$nextTick(() => {
                this.drawConnections();
            });
        },
        updateConnections(oldName, newName) {
            this.connections.forEach(connection => {
                if (connection.from === oldName) connection.from = newName;
                if (connection.to === oldName) connection.to = newName;
            });
        }
    };
}