using BackendOcago.Models.Database.Entities;
using BackendOcago.Models.Database.Repositories;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
namespace BackendOcago.Models.Database;

public class UnitOfWork : IDisposable
{
    
    private IDbContextTransaction _transaction;
    private readonly DataContext _dataContext;
    private UserRepository _userRepository = null!;
    private readonly IRepository<UnitOfWork> _unitOfWorkRepository = null!;
    public ImageRepository ImageRepository { get; init; }

    public GameRepository GameRepository { get; }
    public FriendshipRepository FriendshipRepository { get; init; }
    public UserRepository UserRepository => _userRepository ??= new UserRepository(_dataContext);
    


    public UnitOfWork(DataContext dataContext, ImageRepository imageRepository, FriendshipRepository friendshipRepository)
    {
        _dataContext = dataContext;
        ImageRepository = imageRepository;
        FriendshipRepository = friendshipRepository;
        GameRepository = new GameRepository(dataContext);

    }

    public async Task<bool> SaveAsync()
    {
        return await _dataContext.SaveChangesAsync() > 0;
    }

    public async Task BeginTransactionAsync()
    {
        _transaction = await _dataContext.Database.BeginTransactionAsync();
    }

    public async Task CommitAsync()
    {
        try
        {
            await _dataContext.SaveChangesAsync();
            await _transaction.CommitAsync();
        }
        finally
        {
            await _transaction.DisposeAsync();
        }
    }

    public async Task RollbackAsync()
    {
        if (_transaction != null)
        {
            await _transaction.RollbackAsync();
            await _transaction.DisposeAsync();
        }
    }
    public void Dispose()
    {
        _dataContext.Dispose();
    }
}


