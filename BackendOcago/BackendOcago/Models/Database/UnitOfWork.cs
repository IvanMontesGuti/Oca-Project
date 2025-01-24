using BackendOcago.Models.Database.Entities;
using BackendOcago.Models.Database.Repositories;
namespace BackendOcago.Models.Database;

public class UnitOfWork
{
    private readonly DataContext _dataContext;
    private UserRepository _userRepository = null!;
    private readonly IRepository<UnitOfWork> _unitOfWorkRepository = null!;
    public ImageRepository ImageRepository { get; init; }
    public FriendshipRepository FriendshipRepository { get; init; }
    public UserRepository UserRepository => _userRepository ??= new UserRepository(_dataContext);
    


    public UnitOfWork(DataContext dataContext, ImageRepository imageRepository, FriendshipRepository friendshipRepository)
    {
        _dataContext = dataContext;
        ImageRepository = imageRepository;
        FriendshipRepository = friendshipRepository;

    }

    public async Task<bool> SaveAsync()
    {
        return await _dataContext.SaveChangesAsync() > 0;
    }

}
