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

const teachers = ref([])
const classrooms = ref([])
const courses = ref([])
const dataLoaded = ref(false)
const isRunning = ref(false)
const isComplete = ref(false)
const currentGeneration = ref(0)
const currentFitness = ref(0)
const scheduleMatrix = ref(null)

let worker = null

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

function getScheduleMatrix(individual, teachersList, classroomsList, coursesList) {
  const DAYS = 5
  const SLOTS_PER_DAY = 8
  const matrix = Array(DAYS).fill(null).map(() => 
    Array(SLOTS_PER_DAY).fill(null).map(() => [])
  )

  for (const gene of individual) {
    const day = Math.floor(gene.slot / SLOTS_PER_DAY)
    const slot = gene.slot % SLOTS_PER_DAY
    const course = coursesList.find(c => c.id === gene.courseId)
    const teacher = teachersList.find(t => t.id === course.teacherId)
    const classroom = classroomsList.find(c => c.id === course.classroomId)

    if (day < DAYS && slot < SLOTS_PER_DAY) {
      matrix[day][slot].push({
        course: course,
        teacher: teacher,
        classroom: classroom
      })
    }
  }

  return matrix
}

const workerCode = `
const DAYS = 5
const SLOTS_PER_DAY = 8
const POPULATION_SIZE = 100
const MAX_GENERATIONS = 500
const MUTATION_RATE = 0.1
const CROSSOVER_RATE = 0.7

let teachers = []
let classrooms = []
let courses = []
const totalSlots = DAYS * SLOTS_PER_DAY

function createIndividual() {
  const schedule = []
  for (const course of courses) {
    for (let h = 0; h < course.hoursPerWeek; h++) {
      const slot = Math.floor(Math.random() * totalSlots)
      schedule.push({
        courseId: course.id,
        slot: slot
      })
    }
  }
  return schedule
}

function createPopulation() {
  const population = []
  for (let i = 0; i < POPULATION_SIZE; i++) {
    population.push(createIndividual())
  }
  return population
}

function calculateFitness(individual) {
  let conflicts = 0
  const teacherSlots = new Map()
  const classroomSlots = new Map()
  const courseSlots = new Map()

  for (const gene of individual) {
    const course = courses.find(c => c.id === gene.courseId)
    const teacherKey = course.teacherId + '-' + gene.slot
    const classroomKey = course.classroomId + '-' + gene.slot
    const courseKey = course.id + '-' + gene.slot

    if (teacherSlots.has(teacherKey)) {
      conflicts += 100
    } else {
      teacherSlots.set(teacherKey, true)
    }

    if (classroomSlots.has(classroomKey)) {
      conflicts += 100
    } else {
      classroomSlots.set(classroomKey, true)
    }

    if (courseSlots.has(courseKey)) {
      conflicts += 50
    } else {
      courseSlots.set(courseKey, true)
    }
  }

  for (const course of courses) {
    const scheduled = individual.filter(g => g.courseId === course.id)
    if (scheduled.length !== course.hoursPerWeek) {
      conflicts += Math.abs(scheduled.length - course.hoursPerWeek) * 100
    }
  }

  return 1000 - conflicts
}

function select(population) {
  const tournamentSize = 5
  const tournament = []
  for (let i = 0; i < tournamentSize; i++) {
    tournament.push(population[Math.floor(Math.random() * population.length)])
  }
  tournament.sort((a, b) => calculateFitness(b) - calculateFitness(a))
  return tournament[0]
}

function crossover(parent1, parent2) {
  if (Math.random() > CROSSOVER_RATE) {
    return parent1.slice()
  }
  const point = Math.floor(Math.random() * parent1.length)
  const child = parent1.slice(0, point).concat(parent2.slice(point))
  return child
}

function mutate(individual) {
  const mutated = individual.slice()
  for (let i = 0; i < mutated.length; i++) {
    if (Math.random() < MUTATION_RATE) {
      mutated[i] = {
        courseId: mutated[i].courseId,
        slot: Math.floor(Math.random() * totalSlots)
      }
    }
  }
  return mutated
}

function evolve() {
  let population = createPopulation()
  let bestIndividual = null
  let bestFitness = -Infinity

  for (let gen = 0; gen < MAX_GENERATIONS; gen++) {
    const fitnesses = population.map(ind => calculateFitness(ind))
    
    const currentBestIdx = fitnesses.indexOf(Math.max.apply(null, fitnesses))
    if (fitnesses[currentBestIdx] > bestFitness) {
      bestFitness = fitnesses[currentBestIdx]
      bestIndividual = population[currentBestIdx].slice()
    }

    if (gen % 10 === 0) {
      self.postMessage({
        type: 'progress',
        generation: gen,
        fitness: bestFitness
      })
    }

    if (bestFitness >= 1000) {
      self.postMessage({
        type: 'complete',
        best: bestIndividual,
        fitness: bestFitness
      })
      return
    }

    const newPopulation = [bestIndividual]

    while (newPopulation.length < POPULATION_SIZE) {
      const parent1 = select(population)
      const parent2 = select(population)
      let child = crossover(parent1, parent2)
      child = mutate(child)
      newPopulation.push(child)
    }

    population = newPopulation
  }

  self.postMessage({
    type: 'complete',
    best: bestIndividual,
    fitness: bestFitness
  })
}

self.onmessage = function(e) {
  if (e.data.type === 'start') {
    teachers = e.data.teachers
    classrooms = e.data.classrooms
    courses = e.data.courses
    console.log('[GA Worker] 开始进化...')
    console.log('[GA Worker] 种群大小:', POPULATION_SIZE)
    console.log('[GA Worker] 最大迭代:', MAX_GENERATIONS)
    console.log('[GA Worker] 教师数:', teachers.length)
    console.log('[GA Worker] 课程数:', courses.length)
    evolve()
  }
}
`

async function fetchData() {
  try {
    console.log('[App] 正在从后端获取数据...')
    const response = await fetch('/api/data')
    const data = await response.json()
    teachers.value = data.teachers
    classrooms.value = data.classrooms
    courses.value = data.courses
    dataLoaded.value = true
    console.log('[App] 数据加载完成')
    console.log('[App] 教师:', data.teachers.map(t => t.name).join(', '))
    console.log('[App] 教室:', data.classrooms.map(c => c.name).join(', '))
    console.log('[App] 课程:', data.courses.map(c => c.name).join(', '))
  } catch (e) {
    console.error('[App] 加载数据失败:', e)
  }
}

function startSchedule() {
  if (!dataLoaded.value) return
  
  isRunning.value = true
  isComplete.value = false
  currentGeneration.value = 0
  currentFitness.value = 0
  scheduleMatrix.value = null

  console.log('[App] 点击了开始排课按钮')
  console.log('[App] 创建 Web Worker...')

  if (worker) {
    worker.terminate()
  }

  const blob = new Blob([workerCode], { type: 'application/javascript' })
  const url = URL.createObjectURL(blob)
  worker = new Worker(url)

  worker.onmessage = function(e) {
    if (e.data.type === 'progress') {
      currentGeneration.value = e.data.generation
      currentFitness.value = e.data.fitness
    } else if (e.data.type === 'complete') {
      console.log('[App] 收到 Worker 完成消息')
      console.log('[App] 最终适应度:', e.data.fitness)
      console.log('[App] 最终课表数据 (前10条):', e.data.best.slice(0, 10))
      console.log('[App] 总课时条目数:', e.data.best.length)
      
      currentFitness.value = e.data.fitness
      currentGeneration.value = 500
      scheduleMatrix.value = getScheduleMatrix(
        e.data.best, 
        teachers.value, 
        classrooms.value, 
        courses.value
      )
      
      console.log('[App] 课表矩阵已生成')
      console.log('[App] 状态: 最优解 =', e.data.fitness >= 1000)
      
      isRunning.value = false
      isComplete.value = true
      worker.terminate()
      worker = null
      URL.revokeObjectURL(url)
    }
  }

  worker.onerror = function(e) {
    console.error('[App] Worker 错误:', e)
    isRunning.value = false
  }

  console.log('[App] 向 Worker 发送启动消息')
  const teachersData = JSON.parse(JSON.stringify(teachers.value))
  const classroomsData = JSON.parse(JSON.stringify(classrooms.value))
  const coursesData = JSON.parse(JSON.stringify(courses.value))
  worker.postMessage({
    type: 'start',
    teachers: teachersData,
    classrooms: classroomsData,
    courses: coursesData
  })
}

onMounted(() => {
  console.log('[App] 组件已挂载')
  fetchData()
})
</script>
