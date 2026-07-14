"use client";

/** Bundles every client-side React context provider the app needs, in one place. */
import { ReactNode } from "react";
import { CartProvider } from "@/lib/cart-context";
import { AuthProvider } from "@/lib/auth-context";
import { AdminChatsProvider } from "@/lib/admin-chats-context";
import { NotificationsProvider } from "@/lib/notifications-context";
import { SocketProvider } from "@/lib/socket-context";

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <SocketProvider>
        <AdminChatsProvider>
          <NotificationsProvider>
            <CartProvider>{children}</CartProvider>
          </NotificationsProvider>
        </AdminChatsProvider>
      </SocketProvider>
    </AuthProvider>
  );
}
