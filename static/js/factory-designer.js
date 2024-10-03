// factory-designer.js

import { setupInventoryAndStations } from './inventory-stations.js';
import { setupToolbar } from './toolbar.js';
import { setupFactoryFloor } from './factory-floor.js';
import { setupJSONHandling } from './json-handler.js';
import './edit-popup.js';  // Import the edit popup component

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
            simulationResults: null,
            editPopup: {
                show: false,
                item: null,
                type: null
            },
            darkMode: false,
        },
        methods: {
            ...setupInventoryAndStations(),
            ...setupToolbar(),
            ...setupFactoryFloor(),
            ...setupJSONHandling(),
            toggleDarkMode() {
                document.body.classList.toggle('dark-mode', this.darkMode);
                document.body.classList.toggle('bg-dark', this.darkMode);
                document.body.classList.toggle('text-light', this.darkMode);

                document.getElementById('toolbar').classList.toggle('bg-dark', this.darkMode);

                // Swap images
                const cornerImage = document.getElementById('corner-image');
                const logoImage = document.getElementById('logo-image');

                if (this.darkMode) {
                    cornerImage.src = window.imageUrls.velDark;
                    logoImage.src = window.imageUrls.logoDark;
                } else {
                    cornerImage.src = window.imageUrls.velLight;
                    logoImage.src = window.imageUrls.logoLight;
                }

                // Reinitialize accordions
                this.$nextTick(() => {
                    const accordionElements = document.querySelectorAll('.accordion-collapse');
                    accordionElements.forEach(element => {
                        const bsCollapse = bootstrap.Collapse.getInstance(element);
                        if (bsCollapse) {
                            bsCollapse.dispose();
                        }
                        new bootstrap.Collapse(element, {
                            toggle: false
                        });
                    });
                });
            },
        },
        watch: {
            darkMode: {
                immediate: true,
                handler: 'toggleDarkMode'
            }
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

            // Custom file input handling
            const fileInput = document.getElementById('jsonFileInput');
            const customBtn = document.getElementById('customFileUploadBtn');
            const fileNameDisplay = document.getElementById('fileNameDisplay');

            customBtn.addEventListener('click', function() {
                fileInput.click();
            });

            fileInput.addEventListener('change', function() {
                if (fileInput.files.length > 0) {
                    fileNameDisplay.textContent = fileInput.files[0].name;
                } else {
                    fileNameDisplay.textContent = '';
                }
            });
        },
    });
});