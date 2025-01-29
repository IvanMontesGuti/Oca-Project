export const API_BASE_URL = "https://localhost:7107";

/* --- AUTHORIZATION CONTROLLER --- */
const API_AUTH_URL = `${API_BASE_URL}/api/Auth`;

export const LOGIN_URL = `${API_AUTH_URL}/Login`;
export const REGISTER_URL = `${API_AUTH_URL}/Register`;

/* --- USER CONTROLLER --- */
const API_USER_URL = `${API_BASE_URL}/api/User`;
export const GET_USER_BY_ID_URL = (id) => `${API_USER_URL}/${id}`; 
export const UPDATE_USER_STATE = (num, id) => `${API_USER_URL}/Status?userStatusRequest=${num}&userId=${id}`;
export const GET_COUNT_STATUS = (num) => `${API_USER_URL}/CountStatus?estado=${num}`;

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
export const FRIENDSHIP_GET_ALL_URL = `${API_FRIENDSHIP_URL}/all`; // GET /api/Friendship/all
export const FRIENDSHIP_GET_BY_ID_URL = (userId) => `${API_FRIENDSHIP_URL}/all/${userId}`; // GET /api/Friendship/all/{friendsipId}
export const FRIENDSHIP_DELETE_REQUEST_URL = (friendsipId) => `${API_FRIENDSHIP_URL}/reject/${friendsipId}`; // DELETE /api/Friendship/delete/{friendsipId}
/* --- SEARCH CONTROLLER --- */

export const API_SEARCH_URL = `${API_BASE_URL}/api/Search/users`;

