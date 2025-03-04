"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { UPDATE_USER_URL, GET_USER_BY_ID_URL, CHANGE_PASSWORD_URL } from "@/lib/endpoints/config";
import { Header2 } from "@/components/Home/navUser";
import ProtectedRoute from "@/components/ProtectedRoute/page";

export default function ProfilePage() {
  const { userInfo, updateUserInfo, userId } = useAuth();
  const [formData, setFormData] = useState({
    mail: "",
    nickname: "",
    oldPassword: "",
    newPassword: "",
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (userInfo?.id) {
      fetchUserData(userInfo.id);
    }
  }, [userInfo?.id]);

  const fetchUserData = async (id: string) => {
    try {
      const response = await fetch(GET_USER_BY_ID_URL(id), {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (!response.ok) throw new Error("Error al obtener los datos del usuario");

      const userData = await response.json();
      console.log("📌 Datos del usuario recibidos:", userData);

      setFormData({
        mail: userData.mail || "",
        nickname: userData.nickname || "Usuario",
        oldPassword: "",
        newPassword: "",
      });
    } catch (error) {
      console.error("❌ Error al obtener usuario:", error);
      toast.error("Error al cargar el perfil");
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Actualización del correo y nickname
      const response = await fetch(UPDATE_USER_URL(userId, formData.mail, formData.nickname), {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (!response.ok) throw new Error("Error al actualizar el correo o nickname");

      // Actualización de la contraseña (si se ingresaron campos)
      if (formData.oldPassword && formData.newPassword) {
        const passwordResponse = await fetch(CHANGE_PASSWORD_URL, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({
            userId: userId,
            oldPassword: formData.oldPassword,
            newPassword: formData.newPassword,
          }),
        });

        if (!passwordResponse.ok) throw new Error("La contraseña antigua es incorrecta");

        toast.success("Contraseña actualizada correctamente");
      }

      updateUserInfo({ ...userInfo, email: formData.mail, nickname: formData.nickname });
      toast.success("Perfil actualizado correctamente");
    } catch (error) {
      console.error("❌ Error al actualizar perfil:", error);
      toast.error("Error al actualizar el perfil");
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[#231356] text-white">
        <Header2 />
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold mb-8 text-center">Mi Perfil</h1>
          <div className="max-w-2xl mx-auto bg-[#1B0F40] shadow-lg rounded-lg overflow-hidden">
            {isLoading ? (
              <p className="text-center text-white py-6">Cargando perfil...</p>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6 p-8">
                <InputFields formData={formData} handleInputChange={handleInputChange} />
                <Button type="submit" className="w-full bg-[#4C1D95] hover:bg-[#5B21B6] text-white">
                  Guardar Cambios
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>
      </ProtectedRoute>
      );
}

      interface FormData {
        mail: string;
        nickname: string;
        oldPassword: string;
        newPassword: string;
      }
      
      const InputFields = ({formData, handleInputChange}: {formData: FormData, handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void}) => (
      <>
        <div>
          <Label htmlFor="nickname">Nombre</Label>
          <Input className="text-black" id="nickname" name="nickname" value={formData.nickname} onChange={handleInputChange} required />
        </div>
        <div>
          <Label htmlFor="mail">Email</Label>
          <Input className="text-black" id="mail" name="mail" type="email" value={formData.mail} onChange={handleInputChange} required />
        </div>
        <div>
          <Label htmlFor="oldPassword">Contraseña Actual</Label>
          <Input id="oldPassword" name="oldPassword" type="password" value={formData.oldPassword} onChange={handleInputChange} className="text-black" />
        </div>
        <div>
          <Label htmlFor="newPassword">Nueva Contraseña</Label>
          <Input id="newPassword" name="newPassword" type="password" value={formData.newPassword} onChange={handleInputChange} className="text-black" />
        </div>
    </>
  );
