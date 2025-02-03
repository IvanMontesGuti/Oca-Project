import React, { useEffect, useState } from 'react';
import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { toast } from 'sonner';
import { jwtDecode } from 'jwt-decode';
import { useAuth } from '@/context/AuthContext';

interface DecodedToken {
    email: string;
    role: string;
    unique_name: string;
    family_name?: string; 
    nbf: number;
    exp: number;
    iat: number;
    id: number;
}

export function Header2() {

const {userInfo} = useAuth();


const { family_name, unique_name} = userInfo;
  return (
    <>
    <nav className="container mx-auto px-4 py-6 flex justify-between items-center">
      
      <div className="flex items-center gap-2 ">
      <Image
                src="/images/logo.svg"
                alt="logo"
                width={50}
                height={50}
                
              />
        <span className="text-white text-2xl font-fredoka flex items-center gap-2">
          OcaGo! <ArrowRight className="h-5 w-5" />
        </span>
      </div>
      <div className="flex gap-4">
      
        <Link
          href="/dashboard"
          className="text-white hover:text-gray-200 transition-colors font-montserrat"
        >
          <div className="flex flex-col lg:flex-row gap-8 items-center justify-center">
          <p className="text-white text-center mb-2">
                  {unique_name}
                  
          </p>
          <p><img
                      src={"https://localhost:7107/" + family_name}
                      alt="Avatar"
                      className="w-14 h-14 rounded-full mx-auto mb-4 border border-gray-300"
                  /></p>
          </div>
        </Link>
        
      </div>
    </nav>
      </>
  );
}
