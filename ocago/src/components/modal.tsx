'use client'

import * as Dialog from "@radix-ui/react-dialog";
import { LoginForm } from "./login-form";

export function Modal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-md">
        <Dialog.Title></Dialog.Title>
          <LoginForm onClose={onClose} />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

