const DAYS = 5
const SLOTS_PER_DAY = 8
const POPULATION_SIZE = 100
const MAX_GENERATIONS = 500
const MUTATION_RATE = 0.1
const CROSSOVER_RATE = 0.7

export class GeneticAlgorithm {
  constructor(teachers, classrooms, courses) {
    this.teachers = teachers
    this.classrooms = classrooms
    this.courses = courses
    this.totalSlots = DAYS * SLOTS_PER_DAY
  }

  createIndividual() {
    const schedule = []
    for (const course of this.courses) {
      for (let h = 0; h < course.hoursPerWeek; h++) {
        const slot = Math.floor(Math.random() * this.totalSlots)
        schedule.push({
          courseId: course.id,
          slot: slot
        })
      }
    }
    return schedule
  }

  createPopulation() {
    const population = []
    for (let i = 0; i < POPULATION_SIZE; i++) {
      population.push(this.createIndividual())
    }
    return population
  }

  calculateFitness(individual) {
    let conflicts = 0
    const teacherSlots = new Map()
    const classroomSlots = new Map()
    const courseSlots = new Map()

    for (const gene of individual) {
      const course = this.courses.find(c => c.id === gene.courseId)
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

    for (const course of this.courses) {
      const scheduled = individual.filter(g => g.courseId === course.id)
      if (scheduled.length !== course.hoursPerWeek) {
        conflicts += Math.abs(scheduled.length - course.hoursPerWeek) * 100
      }

      const slots = scheduled.map(g => g.slot).sort()
      for (let i = 1; i < slots.length; i++) {
        if (slots[i] === slots[i - 1] + 1) {
        }
      }
    }

    return 1000 - conflicts
  }

  select(population) {
    const tournamentSize = 5
    const tournament = []
    for (let i = 0; i < tournamentSize; i++) {
      tournament.push(population[Math.floor(Math.random() * population.length)])
    }
    tournament.sort((a, b) => this.calculateFitness(b) - this.calculateFitness(a))
    return tournament[0]
  }

  crossover(parent1, parent2) {
    if (Math.random() > CROSSOVER_RATE) {
      return [...parent1]
    }
    const point = Math.floor(Math.random() * parent1.length)
    const child = [...parent1.slice(0, point), ...parent2.slice(point)]
    return child
  }

  mutate(individual) {
    const mutated = [...individual]
    for (let i = 0; i < mutated.length; i++) {
      if (Math.random() < MUTATION_RATE) {
        mutated[i] = {
          ...mutated[i],
          slot: Math.floor(Math.random() * this.totalSlots)
        }
      }
    }
    return mutated
  }

  async evolve(onProgress) {
    let population = this.createPopulation()
    let bestIndividual = null
    let bestFitness = -Infinity

    for (let gen = 0; gen < MAX_GENERATIONS; gen++) {
      const fitnesses = population.map(ind => this.calculateFitness(ind))
      
      const currentBestIdx = fitnesses.indexOf(Math.max(...fitnesses))
      if (fitnesses[currentBestIdx] > bestFitness) {
        bestFitness = fitnesses[currentBestIdx]
        bestIndividual = [...population[currentBestIdx]]
      }

      if (onProgress) {
        onProgress(gen, bestFitness)
      }

      if (bestFitness >= 1000) {
        break
      }

      const newPopulation = [bestIndividual]

      while (newPopulation.length < POPULATION_SIZE) {
        const parent1 = this.select(population)
        const parent2 = this.select(population)
        let child = this.crossover(parent1, parent2)
        child = this.mutate(child)
        newPopulation.push(child)
      }

      population = newPopulation

      if (gen % 10 === 0) {
        await new Promise(resolve => setTimeout(resolve, 10))
      }
    }

    return {
      best: bestIndividual,
      fitness: bestFitness
    }
  }

  getScheduleMatrix(individual) {
    const matrix = Array(DAYS).fill(null).map(() => 
      Array(SLOTS_PER_DAY).fill(null).map(() => [])
    )

    for (const gene of individual) {
      const day = Math.floor(gene.slot / SLOTS_PER_DAY)
      const slot = gene.slot % SLOTS_PER_DAY
      const course = this.courses.find(c => c.id === gene.courseId)
      const teacher = this.teachers.find(t => t.id === course.teacherId)
      const classroom = this.classrooms.find(c => c.id === course.classroomId)

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
}
