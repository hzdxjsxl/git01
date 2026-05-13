<template>
  <div class="container">
    <div class="header">
      <h1>🏫 智能排课系统</h1>
      <p>基于遗传算法的智能课表生成 | 前端承担全部计算</p>
    </div>

    <div class="card">
      <h2>控制面板</h2>
      <div style="margin: 20px 0;">
        <button class="btn btn-primary" @click="startSchedule" :disabled="isRunning || !dataLoaded">
          {{ isRunning ? '计算中...' : '开始排课' }}
        </button>
        <button class="btn btn-secondary" @click="fetchData" :disabled="isRunning">
          重新加载数据
        </button>
      </div>

      <div v-if="dataLoaded" class="status">
        <div class="status-item">
          <span class="status-label">教师数:</span>
          <span class="status-value">{{ teachers.length }}</span>
        </div>
        <div class="status-item">
          <span class="status-label">教室数:</span>
          <span class="status-value">{{ classrooms.length }}</span>
        </div>
        <div class="status-item">
          <span class="status-label">课程数:</span>
          <span class="status-value">{{ courses.length }}</span>
        </div>
        <div class="status-item">
          <span class="status-label">总课时:</span>
          <span class="status-value">{{ totalHours }}</span>
        </div>
      </div>

      <div v-if="isRunning || currentGeneration > 0">
        <div class="status">
          <div class="status-item">
            <span class="status-label">当前迭代:</span>
            <span class="status-value">{{ currentGeneration }} / 500</span>
          </div>
          <div class="status-item">
            <span class="status-label">适应度:</span>
            <span class="status-value">{{ currentFitness.toFixed(2) }}</span>
          </div>
          <div class="status-item" v-if="isComplete">
            <span class="status-label">状态:</span>
            <span class="status-value" :style="{ color: currentFitness >= 1000 ? '#28a745' : '#ffc107' }">
              {{ currentFitness >= 1000 ? '✨ 最优解' : '可行解' }}
            </span>
          </div>
        </div>
        <div class="progress-container">
          <div class="progress-bar" :style="{ width: progressPercent + '%' }"></div>
        </div>
      </div>
    </div>

    <div v-if="scheduleMatrix" class="card">
      <h2>📅 周课表</h2>
      <div class="schedule-container">
        <table class="schedule-table">
          <thead>
            <tr>
              <th>时间</th>
              <th>周一</th>
              <th>周二</th>
              <th>周三</th>
              <th>周四</th>
              <th>周五</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="slot in 8" :key="slot">
              <td class="time-slot">{{ getTimeSlot(slot - 1) }}</td>
              <td v-for="day in 5" :key="day" :class="scheduleMatrix[day-1][slot-1].length === 0 ? 'empty-cell' : ''">
                <div v-for="(item, idx) in scheduleMatrix[day-1][slot-1]" :key="idx" class="course-cell">
                  <div class="course-name">{{ item.course.name }}</div>
                  <div class="course-info">
                    👨‍🏫 {{ item.teacher.name }}<br>
                    📍 {{ item.classroom.name }}
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="legend">
        <div class="legend-item">
          <div class="legend-color course-color"></div>
          <span>已排课程</span>
        </div>
        <div class="legend-item">
          <div class="legend-color empty-color"></div>
          <span>空闲时段</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { GeneticAlgorithm } from './utils/geneticAlgorithm'

const teachers = ref([])
const classrooms = ref([])
const courses = ref([])
const dataLoaded = ref(false)
const isRunning = ref(false)
const isComplete = ref(false)
const currentGeneration = ref(0)
const currentFitness = ref(0)
const scheduleMatrix = ref(null)

const totalHours = computed(() => {
  return courses.value.reduce((sum, c) => sum + c.hoursPerWeek, 0)
})

const progressPercent = computed(() => {
  return Math.min((currentGeneration.value / 500) * 100, 100)
})

const timeSlots = [
  '第1节 8:00-8:45',
  '第2节 8:55-9:40',
  '第3节 10:00-10:45',
  '第4节 10:55-11:40',
  '第5节 14:00-14:45',
  '第6节 14:55-15:40',
  '第7节 16:00-16:45',
  '第8节 16:55-17:40'
]

function getTimeSlot(index) {
  return timeSlots[index]
}

async function fetchData() {
  try {
    const response = await fetch('/api/data')
    const data = await response.json()
    teachers.value = data.teachers
    classrooms.value = data.classrooms
    courses.value = data.courses
    dataLoaded.value = true
  } catch (e) {
    console.error('加载数据失败:', e)
  }
}

async function startSchedule() {
  if (!dataLoaded.value) return
  
  isRunning.value = true
  isComplete.value = false
  currentGeneration.value = 0
  currentFitness.value = 0
  scheduleMatrix.value = null

  const ga = new GeneticAlgorithm(teachers.value, classrooms.value, courses.value)

  const result = await ga.evolve((gen, fitness) => {
    currentGeneration.value = gen
    currentFitness.value = fitness
  })

  scheduleMatrix.value = ga.getScheduleMatrix(result.best)
  isRunning.value = false
  isComplete.value = true
}

onMounted(() => {
  fetchData()
})
</script>
