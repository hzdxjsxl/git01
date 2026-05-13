const API_BASE = '/api'

export async function fetchAppliances() {
  const response = await fetch(`${API_BASE}/appliances`)
  if (!response.ok) {
    throw new Error(`Failed to fetch appliances: ${response.status}`)
  }
  return await response.json()
}

export async function fetchElectricityPrices() {
  const response = await fetch(`${API_BASE}/electricity-prices`)
  if (!response.ok) {
    throw new Error(`Failed to fetch electricity prices: ${response.status}`)
  }
  return await response.json()
}

export async function loadAllData() {
  const [appliancesResponse, pricesResponse] = await Promise.all([
    fetchAppliances(),
    fetchElectricityPrices()
  ])
  
  return {
    appliances: appliancesResponse.appliances,
    prices: pricesResponse
  }
}
