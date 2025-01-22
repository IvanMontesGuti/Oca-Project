export const API_BASE_URL = "https://localhost:7107";

/* --- AUTHORIZATION CONTROLLER --- */
const API_AUTH_URL = `${API_BASE_URL}/api/Auth`;

export const LOGIN_URL = `${API_AUTH_URL}/Login`;
export const REGISTER_URL = `${API_AUTH_URL}/Register`;

/* --- IMAGE CONTROLLER --- */
const API_IMAGE_URL = `${API_BASE_URL}/api/Images`;

export const IMAGE_GET_ALL_URL = `${API_IMAGE_URL}`; // GET /api/Images
export const IMAGE_POST_URL = `${API_IMAGE_URL}`; // POST /api/Images
export const IMAGE_GET_BY_NAME_URL = (name) => `${API_IMAGE_URL}/${name}`; // GET /api/Images/{name}
export const IMAGE_PUT_BY_NAME_URL = (name) => `${API_IMAGE_URL}/${name}`; // PUT /api/Images/{name}
export const IMAGE_DELETE_BY_NAME_URL = (name) => `${API_IMAGE_URL}/${name}`; // DELETE /api/Images/{name}
