using BackendOcago.Models.Database.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using System;
using System.Linq.Expressions;
using System.Xml.Linq;
namespace BackendOcago.Models.Database.Repositories;

public abstract class Repository<TEntity> : IRepository<TEntity> where TEntity : class
{
    private readonly DataContext _dbContext;
    public Repository(DataContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<TEntity?> GetByConditionAsync(Expression<Func<TEntity, bool>> condition)
    {
    return await _dbContext.Set<TEntity>().FirstOrDefaultAsync(condition);
    }

//Llamada única a la base de datos con todas las consultas
public async Task<ICollection<TEntity>> GetAllAsync()
    {
        return await _dbContext.Set<TEntity>().ToArrayAsync();
    }
    //Obtiene una consulta
    public IQueryable<TEntity> GetQueryable(bool asNoTracking = true)
    {
        DbSet<TEntity> entities = _dbContext.Set<TEntity>();
        return asNoTracking ? entities.AsNoTracking() : entities;
    }

    //Funciones de Obtención, Inserción, Actualización y Eliminación de Datos
    public async Task<TEntity> GetByIdAsync(object id)
    {
        return await _dbContext.Set<TEntity>().FindAsync(id);
    }


    public async Task<TEntity> InsertAsync(TEntity entity)
    {
        EntityEntry<TEntity> entry = await _dbContext.Set<TEntity>().AddAsync(entity);
        return entry.Entity;
    }
    public TEntity Update(TEntity entity)
    {
        EntityEntry<TEntity> entry = _dbContext.Set<TEntity>().Update(entity);
        return entry.Entity;
    }
    public void Delete(TEntity entity)
    {
        _dbContext.Set<TEntity>().Remove(entity);
    }


    public async Task<bool> SaveAsync()
    {
        return await _dbContext.SaveChangesAsync() > 0;
    }

    public async Task<bool> ExistAsync(object id)
    {
        return await GetByIdAsync(id) != null;
    }

    public async Task<TEntity> UpdateAsync(TEntity entity)
    {
        _dbContext.Set<TEntity>().Update(entity);
        await _dbContext.SaveChangesAsync();
        return entity;
    }


    public Task DeleteAsync(TEntity entity)
    {
        throw new NotImplementedException();
    }
}
