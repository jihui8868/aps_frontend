/**
 * Genetic Algorithm Scheduler for APS
 *
 * Parameters:
 * - Population size: 80
 * - Max iterations: 200
 * - Crossover rate: 0.8
 * - Mutation rate: 0.15
 * - Elite count: 4
 * - Deadline penalty: 500/hour
 * - Priority weights: high=3, mid=2, low=1
 */

const CONFIG = {
  populationSize: 80,
  maxIterations: 200,
  crossoverRate: 0.8,
  mutationRate: 0.15,
  eliteCount: 4,
  deadlinePenalty: 500,
  priorityWeights: { high: 3, mid: 2, low: 1, '高': 3, '中': 2, '低': 1 },
}

function estimateHours(order) {
  const qty = order.quantity || 0
  return 8 + qty / 500
}

function buildContext(orders, devices, startDate) {
  const start = new Date(startDate).getTime()
  return orders.map(order => {
    const hours = estimateHours(order)
    const deadline = order.deadline
      ? new Date(order.deadline).getTime()
      : start + 30 * 24 * 3600000
    const priority = CONFIG.priorityWeights[order.priority] || 1
    return {
      orderId: order.id,
      orderNo: order.orderNo || order.code,
      productName: order.productName,
      hours,
      deadline,
      priority,
      quantity: order.quantity,
      unit: order.unit,
    }
  })
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min)) + min
}

function initPopulation(ctx, devices, startTime) {
  const population = []
  for (let i = 0; i < CONFIG.populationSize; i++) {
    const chromosome = ctx.map(task => {
      const deviceIdx = randomInt(0, devices.length)
      const offsetHours = Math.random() * 48
      return {
        orderId: task.orderId,
        deviceIndex: deviceIdx,
        startOffset: offsetHours,
      }
    })
    population.push(chromosome)
  }
  return population
}

function decode(chromosome, ctx, devices, startTime) {
  // Build schedule and resolve conflicts
  const deviceTimelines = {}
  devices.forEach((d, i) => { deviceTimelines[i] = 0 })

  const schedule = chromosome.map((gene, idx) => {
    const task = ctx[idx]
    const devIdx = gene.deviceIndex
    const device = devices[devIdx]
    const desiredStart = gene.startOffset
    const earliestStart = Math.max(desiredStart, deviceTimelines[devIdx])
    const startHour = earliestStart
    const endHour = startHour + task.hours

    deviceTimelines[devIdx] = endHour

    const startMs = startTime + startHour * 3600000
    const endMs = startTime + endHour * 3600000

    return {
      orderId: task.orderId,
      orderNo: task.orderNo,
      productName: task.productName,
      quantity: task.quantity,
      unit: task.unit,
      priority: task.priority,
      deviceId: device.id,
      deviceName: device.name || device.deviceName,
      workshop: device.workshop || device.workshopName || '',
      startTime: new Date(startMs),
      endTime: new Date(endMs),
      hours: task.hours,
      deadline: task.deadline,
      isLate: endMs > task.deadline,
      lateHours: endMs > task.deadline ? (endMs - task.deadline) / 3600000 : 0,
    }
  })

  return schedule
}

function evaluate(chromosome, ctx, devices, startTime) {
  const schedule = decode(chromosome, ctx, devices, startTime)

  // Makespan = max end time
  let maxEnd = 0
  schedule.forEach(s => {
    const endHour = (s.endTime.getTime() - startTime) / 3600000
    if (endHour > maxEnd) maxEnd = endHour
  })

  // Deadline penalty
  let deadlinePenalty = 0
  schedule.forEach(s => {
    if (s.isLate) {
      deadlinePenalty += s.lateHours * CONFIG.deadlinePenalty * s.priority
    }
  })

  // Lower fitness = better
  return maxEnd + deadlinePenalty
}

function tournamentSelect(population, fitnesses, k = 3) {
  let bestIdx = randomInt(0, population.length)
  for (let i = 1; i < k; i++) {
    const candidate = randomInt(0, population.length)
    if (fitnesses[candidate] < fitnesses[bestIdx]) {
      bestIdx = candidate
    }
  }
  return population[bestIdx]
}

function crossover(parent1, parent2) {
  // Uniform crossover
  const child1 = parent1.map((gene, i) => {
    return Math.random() < 0.5 ? { ...gene } : { ...parent2[i] }
  })
  const child2 = parent1.map((gene, i) => {
    return Math.random() < 0.5 ? { ...parent2[i] } : { ...gene }
  })
  return [child1, child2]
}

function mutate(chromosome, deviceCount) {
  return chromosome.map(gene => {
    const newGene = { ...gene }
    if (Math.random() < CONFIG.mutationRate) {
      if (Math.random() < 0.5) {
        // Device mutation
        newGene.deviceIndex = randomInt(0, deviceCount)
      } else {
        // Start time adjustment
        newGene.startOffset = Math.max(0, newGene.startOffset + (Math.random() - 0.5) * 16)
      }
    }
    return newGene
  })
}

/**
 * Run the genetic algorithm scheduler.
 *
 * @param {Object} input - { orders: [], devices: [], startDate: Date }
 * @param {Function} onProgress - callback(iteration, bestFitness)
 * @returns {Promise<{ schedule: [], stats: {} }>}
 */
export function runScheduler(input, onProgress) {
  return new Promise((resolve) => {
    const { orders, devices, startDate } = input
    if (!orders.length || !devices.length) {
      resolve({ schedule: [], stats: { iterations: 0, bestFitness: 0, makespan: 0 } })
      return
    }

    const startTime = new Date(startDate).getTime()
    const ctx = buildContext(orders, devices, startDate)

    let population = initPopulation(ctx, devices, startTime)
    let iteration = 0
    let bestFitness = Infinity
    let bestChromosome = null

    function step() {
      // Evaluate
      const fitnesses = population.map(chr => evaluate(chr, ctx, devices, startTime))

      // Track best
      fitnesses.forEach((f, i) => {
        if (f < bestFitness) {
          bestFitness = f
          bestChromosome = population[i].map(g => ({ ...g }))
        }
      })

      // Elitism: sort and keep top
      const indexed = fitnesses.map((f, i) => ({ f, i }))
      indexed.sort((a, b) => a.f - b.f)
      const newPopulation = []
      for (let e = 0; e < CONFIG.eliteCount; e++) {
        newPopulation.push(population[indexed[e].i].map(g => ({ ...g })))
      }

      // Fill rest with crossover + mutation
      while (newPopulation.length < CONFIG.populationSize) {
        const p1 = tournamentSelect(population, fitnesses)
        const p2 = tournamentSelect(population, fitnesses)

        if (Math.random() < CONFIG.crossoverRate) {
          const [c1, c2] = crossover(p1, p2)
          newPopulation.push(mutate(c1, devices.length))
          if (newPopulation.length < CONFIG.populationSize) {
            newPopulation.push(mutate(c2, devices.length))
          }
        } else {
          newPopulation.push(mutate(p1.map(g => ({ ...g })), devices.length))
        }
      }

      population = newPopulation
      iteration++

      if (onProgress) {
        onProgress(iteration, bestFitness)
      }

      if (iteration < CONFIG.maxIterations) {
        setTimeout(step, 0)
      } else {
        // Decode best
        const schedule = decode(bestChromosome, ctx, devices, startTime)
        const makespan = schedule.reduce((max, s) => {
          const endH = (s.endTime.getTime() - startTime) / 3600000
          return Math.max(max, endH)
        }, 0)

        resolve({
          schedule,
          stats: {
            iterations: iteration,
            bestFitness: Math.round(bestFitness * 100) / 100,
            makespan: Math.round(makespan * 10) / 10,
          },
        })
      }
    }

    setTimeout(step, 0)
  })
}
