export interface User {
    id: string
    nickname: string
    status: 0 | 1 // 0: no amigo, 1: amigo
  }
  
  export interface FriendRequest {
    id: string
    from: User
  }
  
  