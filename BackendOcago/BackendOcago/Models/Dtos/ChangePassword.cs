namespace BackendOcago.Models.Dtos
{
    public class ChangePassword
    {
        public long UserId { get; set; }
        public string OldPassword { get; set; }
        public string NewPassword { get; set; }
    }
}
