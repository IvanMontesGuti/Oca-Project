"use client";

import React, { useEffect, useState } from "react";
import { GET_ALL_USERS_URL, CHANGE_ROLE_USER_URL, API_BASE_URL } from "@/lib/endpoints/config";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Header2 } from "@/components/Home/navUser";
interface User {
    id: string;
    nickname: string;
    mail: string;
    role: "user" | "admin" | "bloqueado";
    avatarUrl?: string | null;
}

export default function AdminPanel() {
    const { userInfo } = useAuth();
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    useEffect(() => {
        if (userInfo?.role === "admin") {
            fetchUsers();
        }
    }, [userInfo]);

    const fetchUsers = async () => {
        try {
            const response = await fetch(GET_ALL_USERS_URL);
            if (!response.ok) throw new Error("Error al obtener los usuarios");
            const data = await response.json();
            setUsers(data);
            setIsLoading(false);
        } catch (error) {
            console.error("Error al cargar usuarios:", error);
        }
    };

    const handleChangeRole = async (userId: string, newRole: "user" | "admin" | "bloqueado") => {
        if (newRole === "bloqueado") {
            const confirm = window.confirm("¿Estás seguro de que deseas bloquear a este usuario?");
            if (!confirm) return;
        }

        try {
            const response = await fetch(CHANGE_ROLE_USER_URL(userId, newRole), {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
            });

            if (!response.ok) throw new Error("Error al cambiar el rol del usuario");

            setUsers((prevUsers) =>
                prevUsers.map((user) =>
                    user.id === userId ? { ...user, role: newRole } : user
                )
            );
            toast.success(`El rol del usuario se cambió a ${newRole} correctamente.`);
        } catch (error) {
            console.error("Error cambiando el rol:", error);
            toast.error("Error al cambiar el rol del usuario.");
        }
    };

    if (isLoading) {
        return <div className="text-white text-center">Cargando usuarios...</div>;
    }

    return (
        <div className="min-h-screen bg-[#231356] text-white py-8">
            <Header2 />
            <div className="container mx-auto px-4">
                <h1 className="text-3xl font-bold mb-6 text-center">Panel de Administrador</h1>
                <table className="w-full bg-[#1B0F40] rounded-lg overflow-hidden">
                    <thead>
                        <tr className="bg-[#14102E] text-white">
                            <th className="py-3 px-4 text-left">Avatar</th>
                            <th className="py-3 px-4 text-left">ID</th>
                            <th className="py-3 px-4 text-left">Nickname</th>
                            <th className="py-3 px-4 text-left">Email</th>
                            <th className="py-3 px-4 text-left">Rol</th>
                            <th className="py-3 px-4 text-left">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map((user) => (
                            <tr key={user.id} className="border-b border-[#14102E]">
                                <td className="py-2 px-4">
                                    <Avatar className="w-10 h-10">
                                        <AvatarImage
                                            src={
                                                user.avatarUrl
                                                    ? user.avatarUrl.startsWith("http")
                                                        ? user.avatarUrl
                                                        : `${API_BASE_URL}/${user.avatarUrl}`
                                                    : "/placeholder.svg"
                                            }
                                            alt={user.nickname}
                                        />
                                        <AvatarFallback>{user.nickname?.slice(0, 1).toUpperCase() || "NA"}</AvatarFallback>
                                    </Avatar>
                                </td>
                                <td className="py-2 px-4">{user.id}</td>
                                <td className="py-2 px-4">{user.nickname}</td>
                                <td className="py-2 px-4">{user.mail}</td>
                                <td className="py-2 px-4">
                                    <select
                                        value={user.role}
                                        onChange={(e) => handleChangeRole(user.id, e.target.value as User["role"])}
                                        className={`p-1 rounded ${user.role === "admin"
                                                ? "bg-green-500"
                                                : user.role === "bloqueado"
                                                    ? "bg-red-500"
                                                    : "bg-gray-500"
                                            } text-white`}
                                    >
                                        <option value="user">User</option>
                                        <option value="admin">Admin</option>
                                        <option value="bloqueado">Bloqueado</option>
                                    </select>
                                </td>
                                <td className="py-2 px-4">
                                    {user.role === "bloqueado" ? (
                                        <Button
                                            variant="outline"
                                            className="text-red-500 border-red-500 hover:bg-red-500 hover:text-white"
                                            onClick={() => handleChangeRole(user.id, "user")}
                                        >
                                            Quitar Bloqueo
                                        </Button>
                                    ) : (
                                        <Button
                                            variant="outline"
                                            className="text-yellow-500 border-yellow-500 hover:bg-yellow-500 hover:text-white"
                                            onClick={() => handleChangeRole(user.id, "bloqueado")}
                                        >
                                            Bloquear
                                        </Button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
