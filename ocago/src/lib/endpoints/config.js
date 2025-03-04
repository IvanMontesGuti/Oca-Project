const API_BASE = "localhost:7107";

export const API_BASE_URL = `https://${API_BASE}`;
export const API_BASE_SOCKET_URL = `wss://${API_BASE}`;

/* --- AUTHORIZATION CONTROLLER --- */
const API_AUTH_URL = `${API_BASE_URL}/api/Auth`;
export const LOGIN_URL = `${API_AUTH_URL}/Login`;
export const REGISTER_URL = `${API_AUTH_URL}/Register`;

/* --- USER CONTROLLER --- */
const API_USER_URL = `${API_BASE_URL}/api/User`;
export const GET_USER_BY_ID_URL = (id) => `${API_USER_URL}/${id}`; 
export const GET_USER_BY_NICKNAME_URL = (nickname) => `${API_USER_URL}/Get/${nickname}`; 
export const UPDATE_USER_URL = (userId, newMail, newNickname) => `${API_USER_URL}/Update?userId=${userId}&newMail=${encodeURIComponent(newMail)}&newNickname=${encodeURIComponent(newNickname)}`;
export const CHANGE_PASSWORD_URL = `${API_USER_URL}/ChangePassword`;
export const UPDATE_USER_STATE = (num, id) => `${API_USER_URL}/Status?userStatusRequest=${num}&userId=${id}`;
export const GET_COUNT_STATUS = (num) => `${API_USER_URL}/CountStatus?estado=${num}`;
export const GET_USER_HISTORY = (id) => `${API_USER_URL}/History?userId=${id}`;
export const API_GAME_URL = (id) => `${API_USER_URL}/allMatches/${id}`;

export const API_GAMES_URL =(userId) => `${API_USER_URL}/allMatches/${userId}`;
export const CHANGE_ROLE_USER_URL = (userId, role) =>`${API_USER_URL}/ChangeRole?userId=${userId}&roleChanged=${role}`
export const GET_ALL_USERS_URL = `${API_USER_URL}/all`
/* --- IMAGE CONTROLLER --- */
const API_IMAGE_URL = `${API_BASE_URL}/api/Images`;
export const IMAGE_GET_ALL_URL = `${API_IMAGE_URL}`; // GET /api/Images
export const IMAGE_POST_URL = `${API_IMAGE_URL}`; // POST /api/Images
export const IMAGE_GET_BY_NAME_URL = (name) => `${API_IMAGE_URL}/${name}`; // GET /api/Images/{name}
export const IMAGE_PUT_BY_NAME_URL = (name) => `${API_IMAGE_URL}/${name}`; // PUT /api/Images/{name}
export const IMAGE_DELETE_BY_NAME_URL = (name) => `${API_IMAGE_URL}/${name}`; // DELETE /api/Images/{name}

/* --- FRIENDSHIP CONTROLLER --- */
const API_FRIENDSHIP_URL = `${API_BASE_URL}/api/Friendship`;
export const FRIENDSHIP_SEND_REQUEST_URL = `${API_FRIENDSHIP_URL}/send`; // POST /api/Friendship/send
export const FRIENDSHIP_RECEIVED_REQUEST_URL = (userId) => `${API_FRIENDSHIP_URL}/received/${userId}`; // POST /api/Friendship/received/{userId}
export const FRIENDSHIP_ACCEPT_REQUEST_URL = (friendsipId) => `${API_FRIENDSHIP_URL}/accept/${friendsipId}`; // POST /api/Friendship/accept/{friendsipId}
export const FRIENDSHIP_REJECT_REQUEST_URL = (friendsipId) => `${API_FRIENDSHIP_URL}/reject/${friendsipId}`; // POST /api/Friendship/reject/{friendsipId}
export const FRIENDSHIP_GET_ALL_URL = `${API_FRIENDSHIP_URL}/all`; // GET /api/Friendship/all
export const FRIENDSHIP_GET_BY_ID_URL = (userId) => `${API_FRIENDSHIP_URL}/all/${userId}`; // GET /api/Friendship/all/{friendsipId}
export const FRIENDSHIP_DELETE_REQUEST_URL = (friendsipId) => `${API_FRIENDSHIP_URL}/reject/${friendsipId}`; // DELETE /api/Friendship/delete/{friendsipId}

/* --- SEARCH CONTROLLER --- */
export const API_SEARCH_URL = (query) => `${API_BASE_URL}/api/Search/users?query=${query}`; // GET /api/Search/users?query={query}

/* --- GAME CONTROLLER --- */
export const GAME_CREATE_URL = (userId) => `${API_GAME_URL}?userId=${userId}`; // POST /api/Game
export const GAME_JOIN_URL = (gameId, userId) => `${API_GAME_URL}/${gameId}/join?UserId=${userId}`; // POST /api/Game/{gameId}/join
export const GAME_MOVE_URL = (gameId, userId) => `${API_GAME_URL}/${gameId}/move?UserId=${userId}`; // POST /api/Game/{gameId}/move
export const GAME_GET_BY_ID_URL = (gameId) => `${API_GAME_URL}/${gameId}`; // GET /api/Game/{gameId}
// export const GAME_GET_ACTIVE_URL = `${API_GAME_URL}`; 
export const SEARCH_FRIENDS_URL = (query, userId) => `${API_BASE_URL}/api/Search/friends?query=${query}&userId=${userId}`;
export const SEARCH_NONFRIENDS_URL = (query, userId) => `${API_BASE_URL}/api/Search/nonfriends?query=${query}&userId=${userId}`;
