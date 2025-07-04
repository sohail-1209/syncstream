
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

    // If user exists, check if we need to update their avatar to the new style.
    if (localUser && (!localUser.avatar || !localUser.avatar.includes('/adventurer/'))) {
        localUser.avatar = `https://api.dicebear.com/8.x/adventurer/svg?seed=${encodeURIComponent(localUser.name)}`;
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
      const name = `${adjective} ${animal}`;

      const newUser: LocalUser = {
        name: name,
        avatar: `https://api.dicebear.com/8.x/adventurer/svg?seed=${encodeURIComponent(name)}`,
        id: newId,
      };
      localStorage.setItem('syncstream_user', JSON.stringify(newUser));
      setUser(newUser);
    }
  }, []);

  return user;
}
