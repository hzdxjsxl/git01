<template>
  <div class="form-group">
    <template v-if="field.type === 'text'">
      <label>
        {{ field.label }}
        <span v-if="field.required" class="required-star">*</span>
      </label>
      <input
        type="text"
        :value="fieldValue"
        :placeholder="field.placeholder || ''"
        @input="handleInput($event.target.value)"
      />
    </template>

    <template v-else-if="field.type === 'textarea'">
      <label>
        {{ field.label }}
        <span v-if="field.required" class="required-star">*</span>
      </label>
      <textarea
        :value="fieldValue"
        :placeholder="field.placeholder || ''"
        @input="handleInput($event.target.value)"
      ></textarea>
    </template>

    <template v-else-if="field.type === 'number'">
      <label>
        {{ field.label }}
        <span v-if="field.required" class="required-star">*</span>
      </label>
      <input
        type="number"
        :value="fieldValue"
        :placeholder="field.placeholder || ''"
        @input="handleInput($event.target.value)"
      />
    </template>

    <template v-else-if="field.type === 'select'">
      <label>
        {{ field.label }}
        <span v-if="field.required" class="required-star">*</span>
      </label>
      <select :value="fieldValue || ''" @change="handleInput($event.target.value)">
        <option value="" disabled>{{ field.placeholder || '请选择' }}</option>
        <option
          v-for="option in field.options"
          :key="option.value"
          :value="option.value"
        >
          {{ option.label }}
        </option>
      </select>
    </template>

    <template v-else-if="field.type === 'radio'">
      <label>
        {{ field.label }}
        <span v-if="field.required" class="required-star">*</span>
      </label>
      <div class="radio-group">
        <label v-for="option in field.options" :key="option.value" class="radio-item">
          <input
            type="radio"
            :name="path"
            :value="option.value"
            :checked="fieldValue === option.value"
            @change="handleInput(option.value)"
          />
          <span>{{ option.label }}</span>
        </label>
      </div>
    </template>

    <template v-else-if="field.type === 'checkbox'">
      <label>
        {{ field.label }}
        <span v-if="field.required" class="required-star">*</span>
      </label>
      <div class="checkbox-group">
        <label v-for="option in field.options" :key="option.value" class="checkbox-item">
          <input
            type="checkbox"
            :value="option.value"
            :checked="isCheckboxChecked(option.value)"
            @change="handleCheckboxChange(option.value, $event.target.checked)"
          />
          <span>{{ option.label }}</span>
        </label>
      </div>
    </template>

    <template v-else-if="field.type === 'group'">
      <div class="nested-group">
        <div class="group-title">{{ field.label }}</div>
        <component
          :is="DynamicFormComponent"
          :fields="field.fields"
          :form-data="formData"
          :path="path"
          @update:form-data="(p, v) => updateFormData(p, v)"
        />
      </div>
    </template>

    <template v-else-if="field.type === 'conditionalGroup'">
      <div class="conditional-section">
        <component
          :is="DynamicFormComponent"
          :fields="field.fields"
          :form-data="formData"
          :path="path"
          @update:form-data="(p, v) => updateFormData(p, v)"
        />
      </div>
    </template>
  </div>
</template>

<script>
export default {
  name: 'DynamicField',
  components: {},
  props: {
    field: {
      type: Object,
      required: true
    },
    formData: {
      type: Object,
      required: true
    },
    path: {
      type: String,
      required: true
    },
    updateFormData: {
      type: Function,
      required: true
    }
  },
  data() {
    return {
      DynamicFormComponent: null
    }
  },
  computed: {
    fieldValue() {
      return this.getNestedValue(this.path)
    }
  },
  created() {
    this.DynamicFormComponent = () => import('./DynamicForm.vue')
  },
  methods: {
    getNestedValue(key) {
      const parts = key.split('.')
      let current = this.formData
      for (const part of parts) {
        if (current === null || current === undefined) return undefined
        current = current[part]
      }
      return current
    },
    handleInput(value) {
      const typedValue = this.coerceValue(value)
      this.updateFormData(this.path, typedValue)
    },
    coerceValue(value) {
      if (this.field.type === 'number') {
        const num = parseFloat(value)
        return isNaN(num) ? null : num
      }
      return value
    },
    isCheckboxChecked(value) {
      const currentValue = this.fieldValue
      if (Array.isArray(currentValue)) {
        return currentValue.includes(value)
      }
      return false
    },
    handleCheckboxChange(value, checked) {
      let currentValue = this.fieldValue
      if (!Array.isArray(currentValue)) {
        currentValue = []
      }
      
      let newValue
      if (checked) {
        newValue = [...currentValue, value]
      } else {
        newValue = currentValue.filter(v => v !== value)
      }
      
      this.updateFormData(this.path, newValue)
    }
  }
}
</script>
