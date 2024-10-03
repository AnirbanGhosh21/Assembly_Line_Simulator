// edit-popup.js
Vue.component('edit-popup', {
  props: ['item', 'type'],
  data() {
    return {
      editedItem: this.type === 'worker' 
        ? { ...this.item }
        : JSON.parse(JSON.stringify(this.item))
    };
  },
  methods: {
    save() {
      this.$emit('save', this.editedItem);
    },
    cancel() {
      this.$emit('cancel');
    },
    deleteItem() {
      if (confirm('Are you sure you want to delete this item?')) {
        this.$emit('delete');
      }
    }
  },
  template: `
    <div class="edit-popup" :class="{ 'dark-mode': darkMode }">
      <div class="edit-popup-content">
        <h3>Edit {{ type }}</h3>
        <template v-if="type === 'inventory'">
          <input v-model="editedItem" class="form-control mb-2" />
        </template>
        <template v-if="type === 'station'">
          <input v-model="editedItem.name" class="form-control mb-2" placeholder="Name" />
          <input v-model.number="editedItem.processingTime" type="number" class="form-control mb-2" placeholder="Processing Time" />
          <input v-model="editedItem.outputName" class="form-control mb-2" placeholder="Output Name" />
          <input v-model.number="editedItem.processingCapacity" type="number" class="form-control mb-2" placeholder="Processing Capacity" />
          <input v-model.number="editedItem.complexity" type="range" class="form-range mb-2" min="0" max="1" step="0.1" />
          <small class="form-text text-muted mb-2">Complexity: {{ editedItem.complexity ? editedItem.complexity.toFixed(1) : '0.0' }}</small>
        </template>
        <template v-if="type === 'worker'">
          <input v-model.number="editedItem.count" type="number" class="form-control mb-2" placeholder="Number of Workers" />
          <input v-model.number="editedItem.skillDistribution" type="range" class="form-range mb-2" min="0" max="1" step="0.1" />
          <small class="form-text text-muted mb-2">Skill Distribution: {{ editedItem.skillDistribution ? editedItem.skillDistribution.toFixed(1) : '0.0' }}</small>
        </template>
        <div class="d-flex justify-content-between">
          <button @click="deleteItem" class="btn btn-danger">Delete</button>
          <div>
            <button @click="cancel" class="btn btn-secondary me-2">Cancel</button>
            <button @click="save" class="btn btn-primary">Save</button>
          </div>
        </div>
      </div>
    </div>
  `
});