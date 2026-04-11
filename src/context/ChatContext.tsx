import { logger } from "../utils/logger";
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { chatService } from '../services/chatService';
import { getAuth, onIdTokenChanged, User } from 'firebase/auth';


interface ChatContextProps {
    chats: any[];
    reload: () => Promise<void>;
    unreadCount: number;
}


const ChatContext = createContext<ChatContextProps | undefined>(undefined);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [chats, setChats] = useState<any[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
    const [initialized, setInitialized] = useState(false);

    const loadChats = useCallback(async () => {
        try {
            const data = await chatService.fetchChats();
            setChats(data);
            const unread = data.reduce((acc: number, chat: any) => acc + (chat.unread || 0), 0);
            setUnreadCount(unread);
        } catch (error) {
            logger.error('Error cargando chats:', error);
        }
    }, []);

    useEffect(() => {
        const auth = getAuth();
        const unsubscribe = onIdTokenChanged(auth, async (user) => {
            setFirebaseUser(user);
            setInitialized(true);
        });

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (initialized && firebaseUser) {
          setTimeout(() => {
            loadChats();
          }, 3000); // lo hace en segundo plano, 3 segundos después de login
        }
      }, [initialized, firebaseUser, loadChats]);

    return (
        <ChatContext.Provider value={{ chats, reload: loadChats, unreadCount }}>
            {children}
        </ChatContext.Provider>
    );
};

export const useChatContext = (): ChatContextProps => {
    const context = useContext(ChatContext);
    if (!context) {
        throw new Error('useChatContext debe usarse dentro de ChatProvider');
    }
    return context;
};
