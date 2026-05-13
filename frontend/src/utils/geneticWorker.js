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
    const teacherKey = `${course.teacherId}-${gene.slot}`
    const classroomKey = `${course.classroomId}-${gene.slot}`
    const courseKey = `${course.id}-${gene.slot}`

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
    return [...parent1]
  }
  const point = Math.floor(Math.random() * parent1.length)
  const child = [...parent1.slice(0, point), ...parent2.slice(point)]
  return child
}

function mutate(individual) {
  const mutated = [...individual]
  for (let i = 0; i < mutated.length; i++) {
    if (Math.random() < MUTATION_RATE) {
      mutated[i] = {
        ...mutated[i],
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
    
    const currentBestIdx = fitnesses.indexOf(Math.max(...fitnesses))
    if (fitnesses[currentBestIdx] > bestFitness) {
      bestFitness = fitnesses[currentBestIdx]
      bestIndividual = [...population[currentBestIdx]]
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
