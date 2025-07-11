
'use client';

import { useState, useEffect } from 'react';

const ADJECTIVES = ['Swift', 'Silent', 'Clever', 'Brave', 'Wise', 'Lucky', 'Happy', 'Gentle', 'Proud', 'Funny'];
const ANIMALS = ['Cat', 'Dog', 'Shark', 'Lion', 'Tiger', 'Bear', 'Fox']; 

const ANIMAL_EMOJIS: { [key: string]: string } = {
    'Cat': '🐱',
    'Dog': '🐶',
    'Shark': '🦈',
    'Lion': '🦁',
    'Tiger': '🐯',
    'Bear': '🐻',
    'Fox': '🦊',
};

const ANIMAL_COLORS: { [key: string]: string } = {
    'Cat': 'ffbe0b',
    'Dog': 'fb5607',
    'Shark': '3a86ff',
    'Lion': 'ff006e',
    'Tiger': 'ff9f1c',
    'Bear': '8338ec',
    'Fox': 'e63946',
};


function getRandomItem<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

export type LocalUser = {
  name: string;
  avatar: string;
  id: string;
};

function generateAvatarUrl(animal: string): string {
    const emoji = ANIMAL_EMOJIS[animal] || '😀';
    const color = ANIMAL_COLORS[animal] || 'cccccc';
    return `https://api.dicebear.com/8.x/fun-emoji/svg?emoji=${encodeURIComponent(emoji)}&backgroundColor=${color}`;
}

// Function to create a brand new user
function createNewUser(): LocalUser {
    const adjective = getRandomItem(ADJECTIVES);
    const animal = getRandomItem(ANIMALS);
    const newId = crypto.randomUUID();
    const name = `${adjective} ${animal}`;

    return {
        name: name,
        avatar: generateAvatarUrl(animal),
        id: newId,
    };
}


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
        const nameParts = localUser.name.split(' ');
        const currentAnimal = nameParts.length > 1 ? nameParts[1] : undefined;
        
        if (currentAnimal && ANIMALS.includes(currentAnimal)) {
            // User is valid and has an approved animal, just make sure avatar is latest style
            const expectedAvatar = generateAvatarUrl(currentAnimal);
            if (localUser.avatar !== expectedAvatar) {
                localUser.avatar = expectedAvatar;
                localStorage.setItem('syncstream_user', JSON.stringify(localUser));
            }
            setUser(localUser);
        } else {
            // User has an old/invalid animal, so we generate a new identity for them.
            const newUser = createNewUser();
            localStorage.setItem('syncstream_user', JSON.stringify(newUser));
            setUser(newUser);
        }
    } else {
      // Create a new user if one doesn't exist at all.
      const newUser = createNewUser();
      localStorage.setItem('syncstream_user', JSON.stringify(newUser));
      setUser(newUser);
    }
  }, []);

  return user;
}
