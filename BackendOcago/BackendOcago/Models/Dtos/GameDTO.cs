using BackendOcago.Models.Database.Entities;

namespace BackendOcago.Models.Dtos
{
    public class GameDTO
    {
        public Guid Id { get; set; }
        public string Player1Id { get; set; }
        public string Player2Id { get; set; }
        public int Player1Position { get; set; }
        public int Player2Position { get; set; }
        public bool IsPlayer1Turn { get; set; }
        public int Player1RemainingTurns { get; set; }
        public int Player2RemainingTurns { get; set; }
        public GameStatus Status { get; set; }
        public string Winner { get; set; }
    }
}
