export interface User {
  id: string;
  username: string;
  type: 'auth' | 'guest';
}

export const genGuestUsername = (id: string) => `Guest-${id.split('-').at(0)!}`;
