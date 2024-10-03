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
            complexity: 0.5,
          },
          connections: [],
          newConnection: {
            from: "",
            to: "",
            quantity: 1,
          },
          factoryJson: null,
          isToolbarCollapsed: false,
          activeSections: {
            inventory: false,
            stations: false,
            connections: false,
          },
        },
        mounted() {
          this.setupDragAndDrop();
          window.addEventListener("resize", this.drawConnections);
        },
        methods: {
          toggleToolbar() {
            this.isToolbarCollapsed = !this.isToolbarCollapsed;
          },
          toggleSection(section) {
            this.activeSections[section] = !this.activeSections[section];
          },
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
            if (
              this.newStation.name &&
              this.newStation.processingTime &&
              this.newStation.outputName &&
              this.newStation.complexity
            ) {
              this.assemblyStations.push({ ...this.newStation });
              this.newStation = {
                name: "",
                processingTime: null,
                outputName: "",
                complexity: 0.5,
              };
              this.$nextTick(() => {
                this.setupDragAndDrop();
              });
            }
          },
          addConnection() {
            if (this.newConnection.from && this.newConnection.to) {
              this.connections.push({ ...this.newConnection });
              this.newConnection = { from: "", to: "", quantity: 1 };
              this.$nextTick(() => {
                this.drawConnections();
              });
            }
          },
          isInventoryItem(item) {
            return item.startsWith("inv-");
          },
          setupDragAndDrop() {
            const that = this;
            interact(".station, .inventory-item").draggable({
              inertia: true,
              modifiers: [
                interact.modifiers.restrictRect({
                  restriction: "parent",
                  endOnly: true,
                }),
              ],
              autoScroll: true,
              listeners: {
                move: dragMoveListener,
                end: function (event) {
                  // Trigger re-drawing connections at the end of drag
                  that.drawConnections();
                },
              },
            });

            function dragMoveListener(event) {
              var target = event.target;
              // Calculate new position based on drag events
              var x =
                (parseFloat(target.getAttribute("data-x")) || 0) + event.dx;
              var y =
                (parseFloat(target.getAttribute("data-y")) || 0) + event.dy;

              // Apply translation (movement) using CSS
              target.style.transform = "translate(" + x + "px, " + y + "px)";

              // Store the position for later use
              target.setAttribute("data-x", x);
              target.setAttribute("data-y", y);

              // Re-draw connections on drag
              that.drawConnections();
            }
          },
          drawConnections() {
            const svg = document.getElementById("connections");
            svg.innerHTML = ""; // Clear previous connections

            const parentRect = document
              .getElementById("factory-floor")
              .getBoundingClientRect();
            svg.setAttribute("width", parentRect.width);
            svg.setAttribute("height", parentRect.height);

            // Loop through each connection
            this.connections.forEach((connection) => {
              const fromElement = document.getElementById(connection.from);
              const toElement = document.getElementById(connection.to);

              if (fromElement && toElement) {
                // Get bounding boxes of elements relative to the parent container
                const fromRect = fromElement.getBoundingClientRect();
                const toRect = toElement.getBoundingClientRect();

                // Adjust for parent container offset (to make positions relative to the parent, not the window)
                const fromX =
                  fromRect.left - parentRect.left + fromRect.width / 2;
                const fromY =
                  fromRect.top - parentRect.top + fromRect.height / 2;
                const toX = toRect.left - parentRect.left + toRect.width / 2;
                const toY = toRect.top - parentRect.top + toRect.height / 2;

                // Create SVG line for connection
                const line = document.createElementNS(
                  "http://www.w3.org/2000/svg",
                  "line"
                );
                line.setAttribute("x1", fromX);
                line.setAttribute("y1", fromY);
                line.setAttribute("x2", toX);
                line.setAttribute("y2", toY);
                line.setAttribute("stroke", "blue");
                line.setAttribute("stroke-width", "2");

                svg.appendChild(line); // Append line to SVG container
              }
            });
          },

          async generateFactory() {
            try {
              const response = await axios.post("/create_factory", {
                inventory: this.inventory,
                assembly_stations: this.assemblyStations,
                connections: this.connections.map((conn) => ({
                  ...conn,
                  from: conn.from.startsWith("inv-")
                    ? conn.from.slice(4)
                    : conn.from,
                })),
              });
              this.factoryJson = JSON.stringify(response.data, null, 2);
            } catch (error) {
              console.error("Error generating factory:", error);
              alert(
                "Error generating factory. Please check the console for details."
              );
            }
          },
        },
      });