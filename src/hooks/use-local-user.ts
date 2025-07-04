'use client';

import { useState, useEffect } from 'react';

const ADJECTIVES = ['Swift', 'Silent', 'Clever', 'Brave', 'Wise', 'Lucky', 'Happy', 'Gentle', 'Proud', 'Funny'];
const ANIMALS = ['Fox', 'Wolf', 'Bear', 'Lion', 'Tiger', 'Eagle', 'Shark', 'Panther', 'Falcon', 'Hawk'];
const COLORS = ['7c3aed', 'f472b6', '2563eb', '10b981', 'f59e0b', 'ef4444', '6366f1', '8b5cf6', 'ec4899', '3b82f6'];

function getRandomItem<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

export type LocalUser = {
  name: string;
  avatar: string;
  id: string;
};

export function useLocalUser(): LocalUser | null {
  const [user, setUser] = useState<LocalUser | null>(null);

  useEffect(() => {
    // This code only runs on the client
    let localUserJson = localStorage.getItem('syncstream_user');
    let localUser: LocalUser | null = null;

    if (localUserJson) {
      try {
        localUser = JSON.parse(localUserJson);
      } catch (e) {
        console.error("Failed to parse user from localStorage", e);
        localUser = null;
      }
    }

    if (localUser && localUser.id && localUser.name && localUser.avatar) {
      setUser(localUser);
    } else {
      const adjective = getRandomItem(ADJECTIVES);
      const animalIndex = Math.floor(Math.random() * ANIMALS.length);
      const animal = ANIMALS[animalIndex];
      const color = COLORS[animalIndex % COLORS.length];

      const newUser: LocalUser = {
        name: `${adjective} ${animal}`,
        avatar: `https://placehold.co/100x100/${color}/ffffff`,
        id: crypto.randomUUID(),
      };
      localStorage.setItem('syncstream_user', JSON.stringify(newUser));
      setUser(newUser);
    }
  }, []);

  return user;
}
