// inventory-stations.js

export function setupInventoryAndStations() {
    return {
        addInventoryItem() {
            if (this.newItem.trim()) {
                this.inventory.push(this.newItem.trim());
                this.newItem = "";
                this.$nextTick(() => {
                    this.setupDragAndDrop();
                });
            }
        },
        addAssemblyStation() {
            if (this.newStation.name && this.newStation.processingTime && this.newStation.outputName && this.newStation.processingCapacity) {
                const newStation = { ...this.newStation };
                newStation.height = this.calculateStationHeight(newStation.processingTime);
                this.assemblyStations.push(newStation);
                this.newStation = {
                    name: "",
                    processingTime: null,
                    outputName: "",
                    complexity: 0.5,
                    processingCapacity: 1,
                };
                this.$nextTick(() => {
                    this.setupDragAndDrop();
                });
            }
        },
        calculateStationHeight(processingTime) {
            return Math.max(50, processingTime * 50); // Minimum height of 50px
        },
        isInventoryItem(item) {
            return this.inventory.includes(item);
        },
        setupDragAndDrop() {
            const that = this;
            interact(".station, .inventory-item, .worker-block").draggable({
                inertia: true,
                modifiers: [
                    interact.modifiers.snap({
                        targets: [
                            interact.snappers.grid({ x: 25, y: 25 })
                        ],
                        range: Infinity,
                        relativePoints: [ { x: 0, y: 0 } ]
                    }),
                    interact.modifiers.restrictRect({
                        restriction: "parent",
                        endOnly: true,
                    }),
                ],
                autoScroll: true,
                listeners: {
                    move: dragMoveListener,
                    end: function (event) {
                        that.drawConnections();
                    },
                },
            });

            function dragMoveListener(event) {
                var target = event.target;
                var x = (parseFloat(target.getAttribute("data-x")) || 0) + event.dx;
                var y = (parseFloat(target.getAttribute("data-y")) || 0) + event.dy;

                x = Math.round(x / 25) * 25;
                y = Math.round(y / 25) * 25;

                target.style.transform = `translate(${x}px, ${y}px)`;

                target.setAttribute("data-x", x);
                target.setAttribute("data-y", y);

                that.drawConnections();
            }
        },


        saveWorkers() {
            if (this.workers.length === 0) {
                this.$emit('show-alert', {
                    message: "No workers to save. Please generate workers first.",
                    type: "warning"
                });
                return;
            }

            axios.post("/save_workers", {
                workers: this.workers,
                distribution: this.workerDefinition.skillDistribution
            }, {
                responseType: 'blob'
            }).then(response => {
                const blob = new Blob([response.data], { type: 'application/json' });
                const link = document.createElement('a');
                link.href = window.URL.createObjectURL(blob);
                link.download = 'workers.json';
                link.click();
                window.URL.revokeObjectURL(link.href);
                
                this.$emit('show-alert', {
                    message: "Workers JSON has been downloaded.",
                    type: "success"
                });
            }).catch(error => {
                console.error("Error saving workers:", error);
                this.$emit('show-alert', {
                    message: "Error saving workers. Please check the console for details.",
                    type: "danger"
                });
            });
        },

        createAndGenerateWorkers() {
            console.log("createAndGenerateWorkers called");

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

            console.log("Number of workers after generation:", this.workers.length);

            if (this.workers.length === 0) {
                console.log("No workers generated");
                this.$emit('show-alert', {
                    message: "Failed to generate workers. Please check your worker settings.",
                    type: "warning"
                });
                return;
            }

            // Create or update the worker block
            if (!this.workerBlock) {
                this.workerBlock = {
                    id: 'worker-block',
                    x: 50,
                    y: 50,
                    width: 100,
                    height: 100,
                };
                console.log("Worker block created:", this.workerBlock);
            } else {
                console.log("Worker block updated");
            }

            this.$nextTick(() => {
                console.log("Next tick callback");
                this.setupDragAndDrop();
                this.connectWorkerBlockToStations();
                this.drawConnections();
            });

            this.$emit('show-alert', {
                message: this.workerBlock ? "Worker block updated with new workers." : "Worker block created successfully.",
                type: "success"
            });
        },

        deleteWorkerBlock() {
            if (this.workerBlock) {
                this.updateWorkerBlock(null);
                // Remove all connections from the worker block
                this.connections = this.connections.filter(conn => conn.from !== 'worker-block');
                this.$nextTick(() => {
                    this.$emit('draw-connections');
                });
            }
        },

        connectWorkerBlockToStations() {
            this.assemblyStations.forEach(station => {
                this.connections.push({
                    from: 'worker-block',
                    to: station.name,
                    quantity: 1, // or any other relevant quantity
                });
            });

            this.$nextTick(() => {
                this.$emit('draw-connections');
            });
        },

        updateWorkerBlock(newWorkerBlock) {
            this.workerBlock = newWorkerBlock;
        },
    };
}