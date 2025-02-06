const ocas = [5, 9, 14, 18, 23, 27, 32, 36, 41, 45, 50, 54, 59]
const especiales = [6, 12, 19, 26, 31, 42, 52, 53, 58]

export const isOca = (casilla: number): boolean => ocas.includes(casilla)

export const isEspecial = (casilla: number): boolean => especiales.includes(casilla)

export const special = (casilla: number): [number, number] => {
  switch (casilla) {
    case 6:
      return [12, 1] // De puente a puente y tiro porque me lleva la corriente
    case 12:
      return [6, 1] // De puente a puente y tiro porque me lleva la corriente
    case 19:
      return [19, -1] // Posada: un turno sin jugar (el oponente gana un turno)
    case 26:
      return [53, 1] // De dados a dados y tiro porque me ha tocado
    case 31:
      return [31, -2] // Pozo: dos turnos sin jugar (el oponente gana dos turnos)
    case 42:
      return [30, 1] // Laberinto: retrocede a la casilla 30
    case 52:
      return [52, -2] // Cárcel: dos turnos sin jugar (el oponente gana dos turnos)
    case 53:
      return [26, 1] // De dados a dados y tiro porque me ha tocado
    case 58:
      return [1, 1] // Muerte: vuelve al inicio
    default:
      return [casilla, 1]
  }
}

export const oca = (casilla: number): number => {
  const index = ocas.indexOf(casilla)
  return index === ocas.length - 1 ? 63 : ocas[index + 1]
}

export const lanzarDado = (): number => Math.floor(Math.random() * 6) + 1

