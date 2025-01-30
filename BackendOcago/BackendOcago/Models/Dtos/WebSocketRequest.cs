using BackendOcago.Models.Database.Enum;

namespace BackendOcago.Models.Dtos
{
    public class WebSocketRequest
    {
        public long SenderId { get; set; }
        public long ReceiverId { get; set; }
        public string Message { get; set; }
        public FriendshipInvitationStatus Response { get; set; } 
    }
}
