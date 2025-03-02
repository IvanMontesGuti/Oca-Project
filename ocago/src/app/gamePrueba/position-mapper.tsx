"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"

// Mapeo de posiciones a coordenadas x,y en la cuadrícula de 12x8
const POSITION_COORDINATES = {
  1: { x: 3, y: 7 },
  2: { x: 4, y: 7 },
  3: { x: 5, y: 7 },
  4: { x: 6, y: 7 },
  5: { x: 7, y: 7 },
  6: { x: 8, y: 7 },
  7: { x: 9, y: 7 },
  8: { x: 10, y: 7 },
  9: { x: 11, y: 7 },
  10: { x: 11, y: 6 },
  11: { x: 11, y: 5 },
  12: { x: 11, y: 4 },
  13: { x: 11, y: 3 },
  14: { x: 11, y: 2 },
  15: { x: 11, y: 1 },
  16: { x: 11, y: 0 },
  17: { x: 10, y: 0 },
  18: { x: 9, y: 0 },
  19: { x: 8, y: 0 },
  20: { x: 7, y: 0 },
  21: { x: 6, y: 0 },
  22: { x: 5, y: 0 },
  23: { x: 4, y: 0 },
  24: { x: 3, y: 0 },
  25: { x: 2, y: 0 },
  26: { x: 1, y: 0 },
  27: { x: 0, y: 0 },
  28: { x: 0, y: 1 },
  29: { x: 0, y: 2 },
  30: { x: 0, y: 3 },
  31: { x: 0, y: 4 },
  32: { x: 0, y: 5 },
  33: { x: 0, y: 6 },
  34: { x: 1, y: 6 },
  35: { x: 2, y: 6 },
  36: { x: 3, y: 6 },
  37: { x: 4, y: 6 },
  38: { x: 5, y: 6 },
  39: { x: 6, y: 6 },
  40: { x: 7, y: 6 },
  41: { x: 8, y: 6 },
  42: { x: 9, y: 6 },
  43: { x: 10, y: 6 },
  44: { x: 10, y: 5 },
  45: { x: 10, y: 4 },
  46: { x: 10, y: 3 },
  47: { x: 10, y: 2 },
  48: { x: 10, y: 1 },
  49: { x: 9, y: 1 },
  50: { x: 8, y: 1 },
  51: { x: 7, y: 1 },
  52: { x: 6, y: 1 },
  53: { x: 5, y: 1 },
  54: { x: 4, y: 1 },
  55: { x: 3, y: 1 },
  56: { x: 2, y: 1 },
  57: { x: 1, y: 1 },
  58: { x: 1, y: 2 },
  59: { x: 1, y: 3 },
  60: { x: 1, y: 4 },
  61: { x: 1, y: 5 },
  62: { x: 2, y: 5 },
  63: { x: 4, y: 5 },
}

// Constantes del tablero
const BOARD_WIDTH = 12
const BOARD_HEIGHT = 8
const CELL_WIDTH = 99
const CELL_HEIGHT = 113

export default function PositionMapper() {
  const [boardImage, setBoardImage] = useState<string>("/images/tablero2.svg")
  const [showGrid, setShowGrid] = useState<boolean>(true)
  const [showPositions, setShowPositions] = useState<boolean>(true)
  const [selectedPosition, setSelectedPosition] = useState<number>(1)
  const [clickMode, setClickMode] = useState<boolean>(false)
  const [newCoordinates, setNewCoordinates] = useState<Record<number, { x: number; y: number }>>({})

  const boardRef = useRef<HTMLDivElement>(null)

  // Función para obtener coordenadas ajustadas
  const getAdjustedCoordinates = (position: number) => {
    // Usar las nuevas coordenadas si existen, de lo contrario usar las originales
    const coords = newCoordinates[position] || POSITION_COORDINATES[position]
    if (!coords) {
      console.error(`No coordinates found for position ${position}`)
      return { x: 0, y: 0 }
    }
    return coords
  }

  // Función para calcular la posición en porcentaje
  const calculatePercentage = (coord: { x: number; y: number }) => {
    // Calcular la posición exacta en píxeles
    const pixelX = coord.x * CELL_WIDTH + CELL_WIDTH / 2
    const pixelY = coord.y * CELL_HEIGHT + CELL_HEIGHT / 2

    // Convertir a porcentaje para el posicionamiento relativo
    const percentX = (pixelX / (BOARD_WIDTH * CELL_WIDTH)) * 100
    const percentY = (pixelY / (BOARD_HEIGHT * CELL_HEIGHT)) * 100

    return {
      left: `${percentX}%`,
      top: `${percentY}%`,
    }
  }

  // Manejar clics en el tablero para posicionar fichas
  const handleBoardClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!clickMode || !boardRef.current) return

    const rect = boardRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    // Convertir píxeles a coordenadas de celda
    const cellX = Math.floor(x / (rect.width / BOARD_WIDTH))
    const cellY = Math.floor(y / (rect.height / BOARD_HEIGHT))

    // Actualizar las coordenadas para la posición seleccionada
    setNewCoordinates((prev) => ({
      ...prev,
      [selectedPosition]: { x: cellX, y: cellY },
    }))

    console.log(`Posición ${selectedPosition} actualizada a: x=${cellX}, y=${cellY}`)
  }

  // Exportar las coordenadas actualizadas
  const exportCoordinates = () => {
    // Combinar las coordenadas originales con las nuevas
    const updatedCoordinates = { ...POSITION_COORDINATES }

    // Sobrescribir con las nuevas coordenadas
    Object.entries(newCoordinates).forEach(([position, coords]) => {
      updatedCoordinates[Number.parseInt(position)] = coords
    })

    // Convertir a formato de código
    const coordinatesCode = Object.entries(updatedCoordinates)
      .map(([position, coords]) => `  ${position}: { x: ${coords.x}, y: ${coords.y} },`)
      .join("\n")

    const fullCode = `const POSITION_COORDINATES = {\n${coordinatesCode}\n}`

    // Copiar al portapapeles
    navigator.clipboard
      .writeText(fullCode)
      .then(() => alert("Coordenadas copiadas al portapapeles"))
      .catch((err) => console.error("Error al copiar: ", err))

    // También mostrar en la consola
    console.log(fullCode)
  }

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <h1 className="text-3xl font-bold mb-6">Mapeador de Posiciones del Tablero</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div
            ref={boardRef}
            className="relative border-4 border-gray-800 rounded-lg overflow-hidden cursor-crosshair"
            style={{ aspectRatio: `${BOARD_WIDTH * CELL_WIDTH}/${BOARD_HEIGHT * CELL_HEIGHT}` }}
            onClick={handleBoardClick}
          >
            {/* Imagen del tablero */}
            <div
              className="absolute inset-0 bg-contain bg-center bg-no-repeat"
              style={{ backgroundImage: `url(${boardImage})` }}
            />

            {/* Cuadrícula de referencia */}
            {showGrid && (
              <div
                className="absolute inset-0 grid"
                style={{
                  gridTemplateColumns: `repeat(${BOARD_WIDTH}, 1fr)`,
                  gridTemplateRows: `repeat(${BOARD_HEIGHT}, 1fr)`,
                }}
              >
                {Array.from({ length: BOARD_WIDTH * BOARD_HEIGHT }).map((_, index) => {
                  const x = index % BOARD_WIDTH
                  const y = Math.floor(index / BOARD_WIDTH)
                  return (
                    <div
                      key={index}
                      className="border border-red-500 flex items-center justify-center text-xs text-red-800 font-bold opacity-50"
                    >
                      {x},{y}
                    </div>
                  )
                })}
              </div>
            )}

            {/* Mostrar todas las posiciones */}
            {showPositions &&
              Object.entries(POSITION_COORDINATES).map(([pos, _]) => {
                const position = Number.parseInt(pos)
                const isSelected = position === selectedPosition
                const isModified = newCoordinates[position] !== undefined

                return (
                  <div
                    key={pos}
                    className={`absolute w-6 h-6 rounded-full flex items-center justify-center z-10 transition-all duration-200 ${
                      isSelected
                        ? "bg-yellow-500 text-black ring-4 ring-yellow-300 w-8 h-8"
                        : isModified
                          ? "bg-green-500 text-white border-2 border-white"
                          : "bg-blue-600 text-white border border-white"
                    }`}
                    style={{
                      ...calculatePercentage(getAdjustedCoordinates(position)),
                      transform: "translate(-50%, -50%)",
                    }}
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedPosition(position)
                    }}
                  >
                    <span className="text-xs font-bold">{pos}</span>
                  </div>
                )
              })}
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-md">
          <h2 className="text-xl font-bold mb-4">Controles</h2>

          <div className="space-y-6">
            <div>
              <Label htmlFor="position" className="block mb-2">
                Posición seleccionada:
              </Label>
              <div className="flex gap-2">
                <Input
                  id="position"
                  type="number"
                  min="1"
                  max="63"
                  value={selectedPosition}
                  onChange={(e) => setSelectedPosition(Number.parseInt(e.target.value) || 1)}
                  className="w-24"
                />
                <Button onClick={() => setSelectedPosition((prev) => Math.max(1, prev - 1))} variant="outline">
                  -
                </Button>
                <Button onClick={() => setSelectedPosition((prev) => Math.min(63, prev + 1))} variant="outline">
                  +
                </Button>
              </div>
            </div>

            <div>
              <Label className="block mb-2">Coordenadas actuales:</Label>
              <div className="bg-gray-100 p-2 rounded">
                <p>
                  Original: x={POSITION_COORDINATES[selectedPosition]?.x || 0}, y=
                  {POSITION_COORDINATES[selectedPosition]?.y || 0}
                </p>
                {newCoordinates[selectedPosition] && (
                  <p className="text-green-600 font-bold">
                    Nueva: x={newCoordinates[selectedPosition].x}, y={newCoordinates[selectedPosition].y}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="clickMode"
                checked={clickMode}
                onCheckedChange={(checked) => setClickMode(checked as boolean)}
              />
              <Label htmlFor="clickMode">Modo de posicionamiento por clic</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="showGrid"
                checked={showGrid}
                onCheckedChange={(checked) => setShowGrid(checked as boolean)}
              />
              <Label htmlFor="showGrid">Mostrar cuadrícula</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="showPositions"
                checked={showPositions}
                onCheckedChange={(checked) => setShowPositions(checked as boolean)}
              />
              <Label htmlFor="showPositions">Mostrar posiciones</Label>
            </div>

            <div>
              <Button onClick={() => setNewCoordinates({})} variant="destructive" className="w-full mb-2">
                Restablecer cambios
              </Button>

              <Button onClick={exportCoordinates} className="w-full bg-green-600 hover:bg-green-700">
                Exportar coordenadas
              </Button>
            </div>
          </div>

          
        </div>
      </div>
    </div>
  )
}

