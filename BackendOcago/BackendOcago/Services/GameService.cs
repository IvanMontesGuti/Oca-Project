using System;
using System.Collections.Generic;

namespace BackendOcago.Services
{
    public class GameService
    {
        private int dado;
        private int ficha1 = 0;
        private int ficha2 = 0;
        private int turnoNum = 1;
        private int turnosRestantes1 = 1;
        private int turnosRestantes2 = 1;
        private bool turnoJugador1 = true;
        private Random rand = new Random();

        // Lista para almacenar los resultados de cada turno
        public List<JuegoOcaTurno> Turnos { get; private set; } = new List<JuegoOcaTurno>();

        public JuegoOcaResult JugarTurnos()
        {
            // Bucle de juego
            while (ficha1 < 63 && ficha2 < 63)
            {
                // Turno jugador 1
                if (turnoJugador1 && turnosRestantes1 > 0)
                {
                    JugarTurno(ref ficha1, ref turnosRestantes1, ref turnosRestantes2, 1);
                    Turnos.Add(new JuegoOcaTurno
                    {
                        TurnoNum = turnoNum,
                        Jugador = 1,
                        Ficha1 = ficha1,
                        Ficha2 = ficha2,
                        Mensaje = $"Jugador 1 ha lanzado un dado con valor {dado}."
                    });
                    if (turnosRestantes1 <= 0)
                    {
                        turnoJugador1 = false;
                    }
                }
                // Turno jugador 2
                else if (!turnoJugador1 && turnosRestantes2 > 0)
                {
                    JugarTurno(ref ficha2, ref turnosRestantes2, ref turnosRestantes1, 2);
                    Turnos.Add(new JuegoOcaTurno
                    {
                        TurnoNum = turnoNum,
                        Jugador = 2,
                        Ficha1 = ficha1,
                        Ficha2 = ficha2,
                        Mensaje = $"Jugador 2 ha lanzado un dado con valor {dado}."
                    });
                    if (turnosRestantes2 <= 0)
                    {
                        turnoJugador1 = true;
                        turnoNum++;
                    }
                }

                // Si ambos jugadores se quedan sin turnos, se reinician
                if (turnosRestantes1 <= 0 && turnosRestantes2 <= 0)
                {
                    turnosRestantes1 = 1;
                    turnosRestantes2 = 1;
                }
            }

            // Resultado final del juego
            return new JuegoOcaResult
            {
                Ficha1 = ficha1,
                Ficha2 = ficha2,
                Ganador = ficha1 >= 63 ? "Jugador 1" : "Jugador 2",
                TurnoNum = turnoNum,

                DetallesTurnos = Turnos // Agregar los detalles de los turnos al resultado final
            };
        }

        private void JugarTurno(ref int ficha, ref int turnosRestantes, ref int turnosRestantesOponente, int jugador)
        {
            ficha = LanzarDado(ficha, jugador);
            dado = jugador;

            if (ficha > 63)
            {
                ficha = 63 - (ficha - 63);
            }

            if (IsOca(ficha))
            {
                ficha = Oca(ficha);
                turnosRestantes++;
            }
            else if (IsEspecial(ficha))
            {
                (int nuevaPosicion, int nuevosTurnos) = Special(ficha);
                ficha = nuevaPosicion;
                if (nuevosTurnos < 0)
                {
                    turnosRestantesOponente += Math.Abs(nuevosTurnos);
                }
                else
                {
                    turnosRestantes += nuevosTurnos;
                }
                if (nuevosTurnos == 0)
                {
                    turnosRestantes = 0;
                }
            }

            turnosRestantes--;
        }

        // Métodos auxiliares

        private bool IsEspecial(int casilla)
        {
            int[] especiales = { 6, 12, 19, 26, 31, 42, 52, 53, 58 };
            return Array.IndexOf(especiales, casilla) != -1;
        }

        private (int, int) Special(int casilla)
        {
            return casilla switch
            {
                6 => (12, 1),   // De puente a puente y tiro porque me lleva la corriente
                12 => (6, 1),   // De puente a puente y tiro porque me lleva la corriente
                19 => (19, -1), // Posada: un turno sin jugar (el oponente gana un turno)
                26 => (53, 1),  // De dados a dados y tiro porque me ha tocado
                31 => (31, -2), // Pozo: dos turnos sin jugar (el oponente gana dos turnos)
                42 => (30, 1),  // Laberinto: retrocede a la casilla 30
                52 => (52, -2), // Cárcel: dos turnos sin jugar (el oponente gana dos turnos)
                53 => (26, 1),  // De dados a dados y tiro porque me ha tocado
                58 => (1, 1),   // Muerte: vuelve al inicio
                _ => (casilla, 1)
            };
        }

        private bool IsOca(int casilla)
        {
            int[] ocas = { 5, 9, 14, 18, 23, 27, 32, 36, 41, 45, 50, 54, 59 };
            return Array.IndexOf(ocas, casilla) != -1;
        }

        private int Oca(int casilla)
        {
            int[] ocas = { 5, 9, 14, 18, 23, 27, 32, 36, 41, 45, 50, 54, 59 };
            int index = Array.IndexOf(ocas, casilla);
            return index == ocas.Length - 1 ? 63 : ocas[index + 1];
        }

        private int LanzarDado(int ficha, int jugador)
        {
            Random rand = new Random();
            int dado = rand.Next(1, 7);
            int nuevaPosicion = ficha + dado;
            return nuevaPosicion;
        }

        // Resultado del juego
        public class JuegoOcaResult
        {
            public int Ficha1 { get; set; }
            public int Ficha2 { get; set; }
            public string Ganador { get; set; }
            public int TurnoNum { get; set; }
            public List<JuegoOcaTurno> DetallesTurnos { get; set; } // Lista de detalles de cada turno
        }

        // Información de cada turno
        public class JuegoOcaTurno
        {
            public int TurnoNum { get; set; }
            public int Jugador { get; set; }
            public int Ficha1 { get; set; }
            public int Ficha2 { get; set; }
            public string Mensaje { get; set; }
        }
    }
}
