import { SunPosition, SunTrajectoryInput } from '../types'

export class SunTrajectory {
  private static readonly DEG_TO_RAD = Math.PI / 180
  private static readonly RAD_TO_DEG = 180 / Math.PI
  private static readonly EPS = 0.000001

  public static calculate(input: SunTrajectoryInput): SunPosition {
    const { latitude, longitude, date } = input

    const julianDay = this.getJulianDay(date)
    const j2000 = julianDay - 2451545.0

    const declination = this.getDeclination(j2000)
    const rightAscension = this.getRightAscension(j2000)
    const gmst = this.getGMST(j2000)

    const localHourAngle = this.getLocalHourAngle(gmst, longitude, rightAscension)

    const altitude = this.getAltitude(latitude, declination, localHourAngle)
    const azimuth = this.getAzimuth(latitude, declination, localHourAngle, altitude)

    return {
      altitude: Math.max(altitude, 0),
      azimuth: azimuth
    }
  }

  private static getJulianDay(date: Date): number {
    const year = date.getUTCFullYear()
    const month = date.getUTCMonth() + 1
    const day = date.getUTCDate()
    const hours = date.getUTCHours()
    const minutes = date.getUTCMinutes()
    const seconds = date.getUTCSeconds()

    let y = year
    let m = month

    if (m <= 2) {
      y -= 1
      m += 12
    }

    const A = Math.floor(y / 100)
    const B = 2 - A + Math.floor(A / 4)

    const jd = Math.floor(365.25 * (y + 4716)) +
               Math.floor(30.6001 * (m + 1)) +
               day + B - 1524.5

    const fractionalDay = (hours + minutes / 60 + seconds / 3600) / 24

    return jd + fractionalDay
  }

  private static getGMST(j2000: number): number {
    const d = j2000
    const T = d / 36525.0

    let gmst = 280.46061837 +
               360.98564736629 * d +
               0.000387933 * T * T -
               T * T * T / 38710000.0

    gmst = gmst % 360
    if (gmst < 0) gmst += 360

    return gmst
  }

  private static getSolarMeanAnomaly(j2000: number): number {
    const T = j2000 / 36525.0
    let M = 357.52911 + 35999.05029 * T - 0.0001537 * T * T
    M = M % 360
    if (M < 0) M += 360
    return M
  }

  private static getSolarMeanLongitude(j2000: number): number {
    const T = j2000 / 36525.0
    let L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T
    L0 = L0 % 360
    if (L0 < 0) L0 += 360
    return L0
  }

  private static getEquationOfCenter(meanAnomalyDeg: number): number {
    const M = meanAnomalyDeg * this.DEG_TO_RAD
    const T = 0

    const C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(M) +
              (0.019993 - 0.000101 * T) * Math.sin(2 * M) +
              0.000289 * Math.sin(3 * M)

    return C
  }

  private static getTrueLongitude(meanLongitudeDeg: number, equationOfCenter: number): number {
    let O = meanLongitudeDeg + equationOfCenter
    O = O % 360
    if (O < 0) O += 360
    return O
  }

  private static getApparentLongitude(trueLongitudeDeg: number, j2000: number): number {
    const T = j2000 / 36525.0
    const omega = 125.04 - 1934.136 * T
    const lambda = trueLongitudeDeg - 0.00569 - 0.00478 * Math.sin(omega * this.DEG_TO_RAD)
    return lambda
  }

  private static getObliquityOfEcliptic(j2000: number): number {
    const T = j2000 / 36525.0
    let epsilon = 23 + (26 + (21.448 - 46.8150 * T - 0.00059 * T * T + 0.001813 * T * T * T) / 60) / 60
    return epsilon
  }

  private static getCorrectedObliquity(obliquityDeg: number, j2000: number): number {
    const T = j2000 / 36525.0
    const omega = 125.04 - 1934.136 * T
    const epsilon = obliquityDeg + 0.00256 * Math.cos(omega * this.DEG_TO_RAD)
    return epsilon
  }

  private static getDeclination(j2000: number): number {
    const meanAnomaly = this.getSolarMeanAnomaly(j2000)
    const meanLongitude = this.getSolarMeanLongitude(j2000)
    const equationOfCenter = this.getEquationOfCenter(meanAnomaly)
    const trueLongitude = this.getTrueLongitude(meanLongitude, equationOfCenter)
    const apparentLongitude = this.getApparentLongitude(trueLongitude, j2000)
    const obliquity = this.getObliquityOfEcliptic(j2000)
    const correctedObliquity = this.getCorrectedObliquity(obliquity, j2000)

    const epsilonRad = correctedObliquity * this.DEG_TO_RAD
    const lambdaRad = apparentLongitude * this.DEG_TO_RAD

    const sinDeclination = Math.sin(epsilonRad) * Math.sin(lambdaRad)
    let declination = Math.asin(sinDeclination) * this.RAD_TO_DEG

    return declination
  }

  private static getRightAscension(j2000: number): number {
    const meanAnomaly = this.getSolarMeanAnomaly(j2000)
    const meanLongitude = this.getSolarMeanLongitude(j2000)
    const equationOfCenter = this.getEquationOfCenter(meanAnomaly)
    const trueLongitude = this.getTrueLongitude(meanLongitude, equationOfCenter)
    const apparentLongitude = this.getApparentLongitude(trueLongitude, j2000)
    const obliquity = this.getObliquityOfEcliptic(j2000)
    const correctedObliquity = this.getCorrectedObliquity(obliquity, j2000)

    const epsilonRad = correctedObliquity * this.DEG_TO_RAD
    const lambdaRad = apparentLongitude * this.DEG_TO_RAD

    const tanAlpha = Math.cos(epsilonRad) * Math.sin(lambdaRad) / Math.cos(lambdaRad)
    let rightAscension = Math.atan2(Math.cos(epsilonRad) * Math.sin(lambdaRad), Math.cos(lambdaRad)) * this.RAD_TO_DEG

    rightAscension = rightAscension % 360
    if (rightAscension < 0) rightAscension += 360

    return rightAscension
  }

  private static getLocalHourAngle(gmstDeg: number, longitudeDeg: number, rightAscensionDeg: number): number {
    let LHA = gmstDeg + longitudeDeg - rightAscensionDeg
    LHA = LHA % 360
    if (LHA < 0) LHA += 360
    if (LHA > 180) LHA -= 360
    return LHA
  }

  private static getAltitude(latitudeDeg: number, declinationDeg: number, hourAngleDeg: number): number {
    const latRad = latitudeDeg * this.DEG_TO_RAD
    const decRad = declinationDeg * this.DEG_TO_RAD
    const haRad = hourAngleDeg * this.DEG_TO_RAD

    const sinAltitude = Math.sin(latRad) * Math.sin(decRad) +
                        Math.cos(latRad) * Math.cos(decRad) * Math.cos(haRad)

    let altitude = Math.asin(Math.max(-1, Math.min(1, sinAltitude))) * this.RAD_TO_DEG
    return altitude
  }

  private static getAzimuth(
    latitudeDeg: number,
    declinationDeg: number,
    hourAngleDeg: number,
    altitudeDeg: number
  ): number {
    const latRad = latitudeDeg * this.DEG_TO_RAD
    const decRad = declinationDeg * this.DEG_TO_RAD
    const haRad = hourAngleDeg * this.DEG_TO_RAD
    const altRad = altitudeDeg * this.DEG_TO_RAD

    let numerator = Math.sin(decRad) - Math.sin(latRad) * Math.sin(altRad)
    let denominator = Math.cos(latRad) * Math.cos(altRad)

    if (Math.abs(denominator) < this.EPS) {
      return latitudeDeg > 0 ? 180 : 0
    }

    let cosAzimuth = numerator / denominator
    cosAzimuth = Math.max(-1, Math.min(1, cosAzimuth))

    let azimuth = Math.acos(cosAzimuth) * this.RAD_TO_DEG

    if (Math.sin(haRad) > 0) {
      azimuth = 360 - azimuth
    }

    return azimuth
  }
}
