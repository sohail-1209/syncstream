
'use client';

import { useState, useEffect } from 'react';

const ADJECTIVES = ['Swift', 'Silent', 'Clever', 'Brave', 'Wise', 'Lucky', 'Happy', 'Gentle', 'Proud', 'Funny'];
const ANIMALS = ['Fox', 'Wolf', 'Bear', 'Lion', 'Tiger', 'Eagle', 'Shark', 'Panther', 'Falcon', 'Hawk'];

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
    let userWasModified = false;

    if (localUserJson) {
      try {
        localUser = JSON.parse(localUserJson);
      } catch (e) {
        console.error("Failed to parse user from localStorage", e);
        localUser = null;
      }
    }

    // If user exists but has an old avatar (not from DiceBear), update it.
    if (localUser && localUser.avatar && !localUser.avatar.startsWith('https://api.dicebear.com')) {
        localUser.avatar = `https://api.dicebear.com/8.x/adventurer/svg?seed=${localUser.id}`;
        userWasModified = true;
    }

    if (localUser && localUser.id && localUser.name && localUser.avatar) {
      // If we updated the avatar, save the changes back to localStorage.
      if (userWasModified) {
          localStorage.setItem('syncstream_user', JSON.stringify(localUser));
      }
      setUser(localUser);
    } else {
      // Create a new user if one doesn't exist.
      const adjective = getRandomItem(ADJECTIVES);
      const animal = getRandomItem(ANIMALS);
      const newId = crypto.randomUUID();

      const newUser: LocalUser = {
        name: `${adjective} ${animal}`,
        avatar: `https://api.dicebear.com/8.x/adventurer/svg?seed=${newId}`,
        id: newId,
      };
      localStorage.setItem('syncstream_user', JSON.stringify(newUser));
      setUser(newUser);
    }
  }, []);

  return user;
}
