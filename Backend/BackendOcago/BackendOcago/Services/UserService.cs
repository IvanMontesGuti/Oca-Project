﻿using System;
using BackendOcago.Models.Database.Entities;
using BackendOcago.Models.Database;
using BackendOcago.Models.Dtos;
using BackendOcago.Models.Mappers;
using System.Net;
using Microsoft.AspNetCore.Cors.Infrastructure;
using Microsoft.AspNetCore.Identity.Data;
namespace BackendOcago.Services;

public class UserService
{
    private readonly UnitOfWork _unitOfWork;
    private readonly UserMapper _mapper;
    private readonly CartService _cartService;
    private readonly ReviewService _reviewService;
    private readonly OrderService _orderService;

    public UserService(UnitOfWork unitOfWork, UserMapper mapper, CartService cartService, ReviewService reviewService, OrderService orderService)
    {
        _unitOfWork = unitOfWork;
        _mapper = mapper;
        _cartService = cartService;
        _reviewService = reviewService;
        _orderService = orderService;
    }


    /* ----- GET ----- */

    public async Task<UserDto> GetByIdAsync(long id)
    {
        User user = await _unitOfWork.UserRepository.GetUserDataByIdAsync(id);
        return _mapper.ToDto(user);
    }

    public async Task<IEnumerable<UserDto>> GetAllAsync()
    {
        IEnumerable<User> users = await _unitOfWork.UserRepository.GetAllAsync();
        return _mapper.ToDto(users);
    }


    /* ----- INSERT ----- */

    public async Task<User> InsertAsync(User user)
    {
        await _unitOfWork.UserRepository.InsertAsync(user);
        await _unitOfWork.SaveAsync();

        return user;
    }

    public async Task<UserDto> InsertByMailAsync(RegisterRequest userRequest)
    {
        List<Address> newAddresses = [new Address {
      Addressee = $"{userRequest.Name} {userRequest.Surname}",
      PhoneNumber = userRequest.Phone,
      AddressInfo = userRequest.Address
    }];

        User newUser = new User
        {
            Mail = userRequest.Mail,
            Password = AuthService.HashPassword(userRequest.Password),
            Name = userRequest.Name,
            Surname = userRequest.Surname,
            Phone = userRequest.Phone,
            Role = null,
            Addresses = newAddresses
        };

        return _mapper.ToDto(await InsertAsync(newUser));
    }


    /* ----- UPDATE ----- */

    public async Task<UserDto> UpdateAsync(UserDto user)
    {
        User userEntity = await _unitOfWork.UserRepository.GetByIdAsync(user.Id) ?? throw new Exception("El usuario especificado no existe");

        userEntity.Mail = user.Mail;
        userEntity.Name = user.Name;
        userEntity.Surname = user.Surname;
        userEntity.Phone = user.Phone;

        _unitOfWork.UserRepository.Update(userEntity);

        await _unitOfWork.UserRepository.SaveAsync();

        return _mapper.ToDto(userEntity);
    }

    public async Task<UserDto> UpdateRole(HandleRole handleRole)
    {
        User userEntity = await _unitOfWork.UserRepository.GetByIdAsync(handleRole.UserId) ?? throw new Exception("El usuario no existe");
        userEntity.Role = handleRole.Role;

        _unitOfWork.UserRepository.Update(userEntity);

        await _unitOfWork.UserRepository.SaveAsync();

        return _mapper.ToDto(userEntity);
    }


    /* ----- DELETE ----- */

    public async Task<bool> DeleteAsyncUserById(long id)
    {
        User user = await _unitOfWork.UserRepository.GetByIdAsync(id);
        _unitOfWork.UserRepository.Delete(user);

        return await _unitOfWork.SaveAsync();
    }


    /* ----- FUNCIONES PRIVADAS ----- */

    public Task<bool> IsLoginCorrect(string mail, string password)
    {
        string hashedPassword = AuthService.HashPassword(password);
        return _unitOfWork.UserRepository.IsLoginCorrect(mail.ToLowerInvariant(), hashedPassword);
    }

    public Task<User> GetByMailAsync(string mail)
    {
        return _unitOfWork.UserRepository.GetByMailAsync(mail);
    }
}