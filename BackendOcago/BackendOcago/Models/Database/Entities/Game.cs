namespace BackendOcago.Models.Database.Entities
{
    public class Game
    {
        public Guid Id { get; set; }
        public string Player1Id { get; set; }
        public string Player2Id { get; set; }
        public int Player1Position { get; set; } = 0;
        public int Player2Position { get; set; } = 0;
        public bool IsPlayer1Turn { get; set; } = true;
        public int Player1RemainingTurns { get; set; } = 1;
        public int Player2RemainingTurns { get; set; } = 1;
        public GameStatus Status { get; set; } = GameStatus.WaitingForPlayers;
        public DateTime LastUpdated { get; set; }
        public string Winner { get; set; }
    }

    public enum GameStatus
    {
        WaitingForPlayers,
        InProgress,
        Finished
    }
}
