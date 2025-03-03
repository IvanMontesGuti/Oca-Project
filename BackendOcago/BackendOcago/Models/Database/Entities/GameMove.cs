namespace BackendOcago.Models.Database.Entities
{
    public class GameMove
    {
        public Guid GameId { get; set; }
        public string PlayerId { get; set; }
        public int DiceRoll { get; set; }
        public int NewPosition { get; set; }
        public string Message { get; set; }
        public bool IsSpecialMove { get; set; }
    }
}
