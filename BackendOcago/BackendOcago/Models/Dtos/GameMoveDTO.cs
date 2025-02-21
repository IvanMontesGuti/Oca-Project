using BackendOcago.Models.Database.Entities;

namespace BackendOcago.Models.Dtos
{
    public class GameMoveDTO
    {
        public Guid GameId { get; set; }
        public string PlayerId { get; set; }
        public int DiceRoll { get; set; }
        public int NewPosition { get; set; }
        public string Message { get; set; }
        public bool IsSpecialMove { get; set; }
        public GameStatus GameStatus { get; set; }

        public string NextTurnPlayerId { get; set; }
    }
}
