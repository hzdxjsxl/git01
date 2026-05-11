<template>
  <div class="dynamic-form">
    <template v-for="field in fields" :key="field.key">
      <DynamicField
        v-if="shouldShowField(field)"
        :field="field"
        :form-data="formData"
        :update-form-data="updateFormData"
        :path="path ? `${path}.${field.key}` : field.key"
      />
    </template>
  </div>
</template>

<script>
import DynamicField from './DynamicField.vue'

export default {
  name: 'DynamicForm',
  components: { DynamicField },
  props: {
    fields: {
      type: Array,
      required: true
    },
    formData: {
      type: Object,
      required: true
    },
    path: {
      type: String,
      default: ''
    }
  },
  emits: ['update:formData'],
  methods: {
    updateFormData(path, value) {
      this.$emit('update:formData', path, value)
    },
    shouldShowField(field) {
      if (!field.conditional) return true
      return this.evaluateCondition(field.conditional)
    },
    evaluateCondition(conditional) {
      const { field: depField, operator = 'eq', value } = conditional
      const depValue = this.getNestedValue(depField)
      
      switch (operator) {
        case 'eq':
          return depValue === value
        case 'ne':
          return depValue !== value
        case 'in':
          return Array.isArray(value) && value.includes(depValue)
        case 'contains':
          return Array.isArray(depValue) && depValue.includes(value)
        case 'notContains':
          return Array.isArray(depValue) && !depValue.includes(value)
        default:
          return depValue === value
      }
    },
    getNestedValue(key) {
      const parts = key.split('.')
      let current = this.formData
      for (const part of parts) {
        if (current === null || current === undefined) return undefined
        current = current[part]
      }
      return current
    }
  }
}
</script>
