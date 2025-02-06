export interface Player {
    id: string
    nickname: string
    avatarUrl?: string
    isHost?: boolean
  }
  
  export interface RoomState {
    players: Player[]
    isGameStarted: boolean
  }
  
  