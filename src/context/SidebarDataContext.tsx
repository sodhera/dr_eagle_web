"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { ChatSession } from '@/types/chat';
import { getUserSessions } from '@/services/agentClient';
import { useAuth } from './AuthContext';

interface SidebarDataContextValue {
    chats: ChatSession[];
    isLoading: boolean;
    refreshChats: () => Promise<void>;
    setChats: React.Dispatch<React.SetStateAction<ChatSession[]>>;
    isSidebarOpen: boolean;
    toggleSidebar: () => void;
}

const SidebarDataContext = createContext<SidebarDataContextValue | undefined>(undefined);

export function SidebarDataProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const [chats, setChats] = useState<ChatSession[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const toggleSidebar = useCallback(() => {
        setIsSidebarOpen(prev => !prev);
    }, []);

    const refreshChats = useCallback(async () => {
        if (!user) {
            setChats([]);
            return;
        }

        setIsLoading(true);
        try {
            const userChats = await getUserSessions();
            setChats(userChats);
        } catch (error) {
            console.error('Failed to load chats:', error);
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    useEffect(() => {
        if (user) {
            refreshChats();
        } else {
            setChats([]);
        }
    }, [user, refreshChats]);

    const value: SidebarDataContextValue = {
        chats,
        isLoading,
        refreshChats,
        setChats,
        isSidebarOpen,
        toggleSidebar,
    };

    return (
        <SidebarDataContext.Provider value={value}>
            {children}
        </SidebarDataContext.Provider>
    );
}

export function useSidebarData() {
    const context = useContext(SidebarDataContext);
    if (!context) {
        throw new Error('useSidebarData must be used within a SidebarDataProvider');
    }
    return context;
}
