import { Building } from '../types'

export async function fetchBuildings(): Promise<Building[]> {
  const response = await fetch('/api/buildings')
  if (!response.ok) {
    throw new Error('Failed to fetch buildings')
  }
  return response.json()
}
