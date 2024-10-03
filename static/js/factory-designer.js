// factory-designer.js

import { setupInventoryAndStations } from './inventory-stations.js';
import { setupToolbar } from './toolbar.js';
import { setupFactoryFloor } from './factory-floor.js';
import { setupJSONHandling } from './json-handler.js';
import './edit-popup.js';  // Import the new edit popup component

document.addEventListener('DOMContentLoaded', function() {
    new Vue({
        el: "#app",
        data: {
            inventory: [],
            newItem: "",
            assemblyStations: [],
            newStation: {
                name: "",
                processingTime: null,
                outputName: "",
                processingCapacity: 1,
                complexity: 0.2,
            },
            connections: [],
            newConnection: {
                from: "",
                to: "",
                quantity: 1,
            },
            factoryJson: null,
            contextMenu: {
                show: false,
                x: 0,
                y: 0,
                target: null,
            },
            workerDefinition: {
                count: 1,
                skillDistribution: 0.5
            },
            workers: [],
            workerBlock: null,
            simulationRunning: false,
            simulationResults: {
                stationPerformance: {},
                factoryPerformance: null,
                inventoryLevels: {},
                wipLevels: {}
            },
            demand: 100,
            simulationRunning: false,
            simulationResults: null,
            editPopup: {
                show: false,
                item: null,
                type: null
            },
        },
        methods: {
            ...setupInventoryAndStations(),
            ...setupToolbar(),
            ...setupFactoryFloor(),
            ...setupJSONHandling(),
            ...setupToolbar(),
        },
        mounted() {
            this.setupDragAndDrop();
            document.addEventListener("click", this.hideContextMenu);
            const factoryFloor = document.getElementById("factory-floor");
            factoryFloor.addEventListener("scroll", () => {
                this.$nextTick(() => {
                    this.drawConnections();
                });
            });
        },
    });
});