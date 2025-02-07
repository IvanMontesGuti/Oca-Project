namespace BackendOcago.Models.Dtos
{
    public class WebSocketMessage
    {
        public string Type { get; set; }
        public string SenderId { get; set; }
        public string ReceiverId { get; set; }
        public bool Accepted { get; set; }
        public string Message { get; set; }
        public List<string> ConnectedUsers { get; set; }

        public string LobbyId { get; set; }

    }
}
