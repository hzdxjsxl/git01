<template>
  <div id="app">
    <h1 class="page-title">动态问卷系统</h1>
    
    <div class="nav-tabs">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        :class="['nav-tab', { active: currentTab === tab.key }]"
        @click="currentTab = tab.key"
      >
        {{ tab.label }}
      </button>
    </div>

    <div v-if="currentTab === 'list'" class="form-container">
      <h2 style="margin-bottom: 16px;">问卷模板列表</h2>
      <div class="button-group" style="border-top: none; margin-top: 0; padding-top: 0; margin-bottom: 16px;">
        <button class="btn btn-primary" @click="initDefaultTemplate">
          初始化示例问卷
        </button>
      </div>
      
      <div v-if="templates.length === 0" style="text-align: center; padding: 40px; color: #999;">
        暂无问卷模板，请点击"初始化示例问卷"按钮创建
      </div>
      
      <div v-else class="template-list">
        <div v-for="template in templates" :key="template.id" class="template-item">
          <div>
            <div style="font-weight: 500;">{{ template.templateName }}</div>
            <div style="color: #999; font-size: 12px; margin-top: 4px;">
              ID: {{ template.id }}
            </div>
          </div>
          <div class="template-actions">
            <button class="btn btn-secondary" @click="fillForm(template.id)">
              填写问卷
            </button>
            <button class="btn btn-secondary" @click="viewTemplate(template)">
              查看Schema
            </button>
            <button class="btn btn-secondary" @click="deleteTemplate(template.id)">
              删除
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-else-if="currentTab === 'editor'" class="form-container">
      <h2 style="margin-bottom: 16px;">创建问卷模板</h2>
      <div class="form-group">
        <label>模板名称</label>
        <input type="text" v-model="newTemplateName" placeholder="请输入模板名称" />
      </div>
      <div class="form-group">
        <label>JSON Schema</label>
        <textarea
          v-model="newTemplateSchema"
          placeholder="请输入JSON Schema..."
          style="min-height: 300px; font-family: monospace; font-size: 12px;"
        ></textarea>
      </div>
      <div class="button-group">
        <button class="btn btn-primary" @click="createTemplate">创建模板</button>
        <button class="btn btn-secondary" @click="loadExampleSchema">加载示例Schema</button>
      </div>
    </div>

    <div v-else-if="currentTab === 'fill'" class="form-container">
      <h2 style="margin-bottom: 16px;">填写问卷</h2>
      
      <div v-if="!currentTemplate">
        <p>请先从模板列表选择一个问卷</p>
      </div>
      
      <template v-else>
        <h3 style="margin-bottom: 20px; color: #1890ff;">{{ currentTemplate.templateName }}</h3>
        
        <DynamicForm
          :fields="templateFields"
          :form-data="formData"
          @update:form-data="handleUpdateFormData"
        />
        
        <div class="button-group">
          <button class="btn btn-primary" @click="submitForm">提交问卷</button>
          <button class="btn btn-secondary" @click="resetForm">重置</button>
          <button class="btn btn-secondary" @click="currentTab = 'list'">返回列表</button>
        </div>
        
        <div v-if="submittedData" style="margin-top: 24px;">
          <h4 style="margin-bottom: 12px;">提交的JSON数据：</h4>
          <pre class="json-preview">{{ JSON.stringify(submittedData, null, 2) }}</pre>
        </div>
      </template>
    </div>
  </div>
</template>

<script>
import axios from 'axios'
import DynamicForm from './components/DynamicForm.vue'

export default {
  name: 'App',
  components: { DynamicForm },
  data() {
    return {
      tabs: [
        { key: 'list', label: '模板列表' },
        { key: 'editor', label: '创建模板' },
        { key: 'fill', label: '填写问卷' }
      ],
      currentTab: 'list',
      templates: [],
      currentTemplate: null,
      templateFields: [],
      formData: {},
      submittedData: null,
      newTemplateName: '',
      newTemplateSchema: ''
    }
  },
  mounted() {
    this.loadTemplates()
  },
  methods: {
    async loadTemplates() {
      try {
        const response = await axios.get('/api/form-templates')
        this.templates = response.data
      } catch (error) {
        console.error('加载模板失败:', error)
      }
    },
    
    async initDefaultTemplate() {
      const defaultSchema = this.getDefaultSchema()
      try {
        await axios.post('/api/form-templates', {
          templateName: '用户信息调研问卷',
          templateSchema: JSON.stringify(defaultSchema)
        })
        this.loadTemplates()
        alert('示例模板创建成功！')
      } catch (error) {
        console.error('创建示例模板失败:', error)
        alert('创建示例模板失败')
      }
    },
    
    async createTemplate() {
      if (!this.newTemplateName.trim()) {
        alert('请输入模板名称')
        return
      }
      
      try {
        JSON.parse(this.newTemplateSchema)
      } catch (e) {
        alert('JSON格式错误')
        return
      }
      
      try {
        await axios.post('/api/form-templates', {
          templateName: this.newTemplateName,
          templateSchema: this.newTemplateSchema
        })
        this.newTemplateName = ''
        this.newTemplateSchema = ''
        this.loadTemplates()
        this.currentTab = 'list'
        alert('模板创建成功！')
      } catch (error) {
        console.error('创建模板失败:', error)
        alert('创建模板失败')
      }
    },
    
    async deleteTemplate(id) {
      if (!confirm('确定要删除这个模板吗？')) return
      
      try {
        await axios.delete(`/api/form-templates/${id}`)
        this.loadTemplates()
      } catch (error) {
        console.error('删除模板失败:', error)
        alert('删除模板失败')
      }
    },
    
    async fillForm(id) {
      try {
        const response = await axios.get(`/api/form-templates/${id}`)
        const schema = JSON.parse(response.data.templateSchema)
        this.currentTemplate = response.data
        this.templateFields = schema.fields
        this.formData = {}
        this.submittedData = null
        this.currentTab = 'fill'
      } catch (error) {
        console.error('加载问卷失败:', error)
        alert('加载问卷失败')
      }
    },
    
    viewTemplate(template) {
      try {
        const schema = JSON.parse(template.templateSchema)
        alert('模板Schema:\n\n' + JSON.stringify(schema, null, 2).slice(0, 500) + 
              (JSON.stringify(schema, null, 2).length > 500 ? '\n...(内容过长已截断)' : ''))
      } catch (e) {
        alert('Schema解析失败')
      }
    },
    
    handleUpdateFormData(path, value) {
      const parts = path.split('.')
      let current = this.formData
      
      for (let i = 0; i < parts.length - 1; i++) {
        if (!current[parts[i]]) {
          current[parts[i]] = {}
        }
        current = current[parts[i]]
      }
      
      if (value === null || value === undefined || 
          (typeof value === 'string' && value === '') ||
          (Array.isArray(value) && value.length === 0)) {
        delete current[parts[parts.length - 1]]
      } else {
        current[parts[parts.length - 1]] = value
      }
      
      this.formData = { ...this.formData }
    },
    
    submitForm() {
      this.submittedData = { ...this.formData }
      alert('问卷已提交！请查看下方JSON数据')
    },
    
    resetForm() {
      this.formData = {}
      this.submittedData = null
    },
    
    loadExampleSchema() {
      this.newTemplateName = '用户信息调研问卷'
      this.newTemplateSchema = JSON.stringify(this.getDefaultSchema(), null, 2)
    },
    
    getDefaultSchema() {
      return {
        fields: [
          {
            key: 'name',
            type: 'text',
            label: '姓名',
            required: true,
            placeholder: '请输入您的姓名'
          },
          {
            key: 'age',
            type: 'number',
            label: '年龄',
            required: true,
            placeholder: '请输入您的年龄'
          },
          {
            key: 'gender',
            type: 'radio',
            label: '性别',
            required: true,
            options: [
              { value: 'male', label: '男' },
              { value: 'female', label: '女' },
              { value: 'other', label: '其他' }
            ]
          },
          {
            key: 'education',
            type: 'select',
            label: '学历',
            required: true,
            placeholder: '请选择您的学历',
            options: [
              { value: 'high_school', label: '高中及以下' },
              { value: 'college', label: '大专' },
              { value: 'bachelor', label: '本科' },
              { value: 'master', label: '硕士' },
              { value: 'phd', label: '博士' }
            ]
          },
          {
            key: 'hobbies',
            type: 'checkbox',
            label: '兴趣爱好',
            options: [
              { value: 'reading', label: '阅读' },
              { value: 'music', label: '音乐' },
              { value: 'sports', label: '运动' },
              { value: 'travel', label: '旅行' },
              { value: 'coding', label: '编程' }
            ]
          },
          {
            key: 'hasExperience',
            type: 'radio',
            label: '是否有编程经验？',
            required: true,
            options: [
              { value: 'yes', label: '有' },
              { value: 'no', label: '没有' }
            ]
          },
          {
            key: 'experienceInfo',
            type: 'conditionalGroup',
            label: '编程经验详情',
            conditional: {
              field: 'hasExperience',
              operator: 'eq',
              value: 'yes'
            },
            fields: [
              {
                key: 'years',
                type: 'number',
                label: '编程年限（年）',
                placeholder: '请输入编程年限'
              },
              {
                key: 'languages',
                type: 'checkbox',
                label: '掌握的编程语言',
                options: [
                  { value: 'java', label: 'Java' },
                  { value: 'python', label: 'Python' },
                  { value: 'javascript', label: 'JavaScript' },
                  { value: 'go', label: 'Go' },
                  { value: 'rust', label: 'Rust' }
                ]
              },
              {
                key: 'level',
                type: 'select',
                label: '技术水平',
                placeholder: '请选择技术水平',
                options: [
                  { value: 'beginner', label: '入门级' },
                  { value: 'intermediate', label: '中级' },
                  { value: 'advanced', label: '高级' },
                  { value: 'expert', label: '专家级' }
                ]
              }
            ]
          },
          {
            key: 'contact',
            type: 'group',
            label: '联系方式',
            fields: [
              {
                key: 'phone',
                type: 'text',
                label: '手机号码',
                placeholder: '请输入手机号码'
              },
              {
                key: 'email',
                type: 'text',
                label: '邮箱地址',
                placeholder: '请输入邮箱地址'
              },
              {
                key: 'address',
                type: 'textarea',
                label: '详细地址',
                placeholder: '请输入详细地址'
              }
            ]
          },
          {
            key: 'remarks',
            type: 'textarea',
            label: '备注',
            placeholder: '请输入其他备注信息'
          }
        ]
      }
    }
  }
}
</script>
