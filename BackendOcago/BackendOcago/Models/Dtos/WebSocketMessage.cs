namespace BackendOcago.Models.Dtos
{
    public class WebSocketMessage
    {
        public string Type { get; set; }
        public string SenderId { get; set; }
        public string ReceiverId { get; set; }
        public bool Accepted { get; set; } 
    }
}
