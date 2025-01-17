﻿using BackendOcago.Models.Database.Repositories;
namespace BackendOcago.Models.Database;

public class UnitOfWork
{
    private readonly DataContext _dataContext;
    private UserRepository _userRepository = null!;
    private readonly IRepository<UnitOfWork> _unitOfWorkRepository = null!;
    public ImageRepository ImageRepository { get; init; }


    public UserRepository UserRepository => _userRepository ??= new UserRepository(_dataContext);
    


    public UnitOfWork(DataContext dataContext, ImageRepository imageRepository)
    {
        _dataContext = dataContext;
        ImageRepository = imageRepository;
    }

    public async Task<bool> SaveAsync()
    {
        return await _dataContext.SaveChangesAsync() > 0;
    }

}
