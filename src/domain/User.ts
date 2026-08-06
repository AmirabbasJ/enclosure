export interface User {
  id: string;
  username: string;
  type: 'auth' | 'guest';
}
