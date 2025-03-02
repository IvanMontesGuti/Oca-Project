"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { API_BASE_URL, IMAGE_POST_URL, GET_USER_BY_ID_URL } from "@/lib/endpoints/config";
import { Header2 } from "@/components/Home/navUser";

// ✅ Endpoint actualizado para el update de email y nickname


// ✅ Endpoint para cambiar la contraseña
const CHANGE_PASSWORD_URL = "https://localhost:7107/api/User/ChangePassword";

export default function ProfilePage() {
  const { userInfo, updateUserInfo } = useAuth();
  const [formData, setFormData] = useState({
    mail: "",
    nickname: "",
    oldPassword: "",
    newPassword: "",
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (userInfo?.id) {
      fetchUserData(userInfo.id);
    }
  }, [userInfo?.id]);

  const fetchUserData = async (id: number) => {
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

      setImagePreview(userData.avatarUrl ? `${API_BASE_URL}/${userData.avatarUrl}` : `${API_BASE_URL}/images/default.png`);
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

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // ✅ Actualización de email y nickname
      const updateUrl = UPDATE_USER_URL(userInfo.id, formData.mail, formData.nickname);
      const response = await fetch(updateUrl, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("accesToken")}`,
        },
      });

      if (!response.ok) throw new Error("Error al actualizar la información");

      // ✅ Subida de imagen con nombre basado en nickname
      if (imageFile) {
        const formDataImage = new FormData();
        formDataImage.append("name", `${formData.nickname}.png`);
        formDataImage.append("file", imageFile, `/images/${formData.nickname}.png`);

        const imageResponse = await fetch(IMAGE_POST_URL, {
          method: "POST",
          body: formDataImage,
        });

        if (!imageResponse.ok) throw new Error("Error subiendo la imagen.");
      }

      updateUserInfo({ ...userInfo, mail: formData.mail, nickname: formData.nickname });
      toast.success("Perfil actualizado correctamente");
    } catch (error) {
      console.error("❌ Error al actualizar perfil:", error);
      toast.error("Error al actualizar el perfil");
    }
  };

  // ✅ Manejo del cambio de contraseña
  const handleChangePassword = async () => {
    try {
      const response = await fetch(CHANGE_PASSWORD_URL, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          userId: userInfo.id,
          oldPassword: formData.oldPassword,
          newPassword: formData.newPassword,
        }),
      });

      if (!response.ok) throw new Error("Contraseña antigua incorrecta");

      toast.success("Contraseña cambiada correctamente");
    } catch (error) {
      console.error("❌ Error al cambiar contraseña:", error);
      toast.error("Error al cambiar la contraseña");
    }
  };

  return (
    <div className="min-h-screen bg-[#231356] text-white">
      <Header2 />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8 text-center">Mi Perfil</h1>
        <div className="max-w-2xl mx-auto bg-[#1B0F40] shadow-lg rounded-lg overflow-hidden">
          {isLoading ? (
            <p className="text-center text-white py-6">Cargando perfil...</p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6 p-6">
              <div>
                <Label htmlFor="nickname">Nombre</Label>
                <Input id="nickname" name="nickname" value={formData.nickname} onChange={handleInputChange} required />
              </div>
              <div>
                <Label htmlFor="mail">Email</Label>
                <Input id="mail" name="mail" type="email" value={formData.mail} onChange={handleInputChange} required />
              </div>
              <div>
                <Label htmlFor="profile-image">Imagen de perfil</Label>
                <input id="profile-image" type="file" accept="image/*" onChange={handleImageChange} />
              </div>
              <div>
                <Label htmlFor="oldPassword">Contraseña Actual</Label>
                <Input id="oldPassword" name="oldPassword" type="password" value={formData.oldPassword} onChange={handleInputChange} />
              </div>
              <div>
                <Label htmlFor="newPassword">Nueva Contraseña</Label>
                <Input id="newPassword" name="newPassword" type="password" value={formData.newPassword} onChange={handleInputChange} />
              </div>
              <Button type="submit">Guardar Cambios</Button>
              <Button type="button" onClick={handleChangePassword}>
                Cambiar Contraseña
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
